import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { api } from "../utils/apiClient";
import { Users as UsersIcon, UserPlus, UsersRound, Trash2, Settings, Mail, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type User = {
    userId: string;
    username: string;
    email: string;
    userGroups: string[];
    createdAt?: string;
};

type UserGroup = {
    groupId: string;
    name: string;
    description: string;
    memberCount?: number;
};

export default function Users() {
    // User state
    const [users, setUsers] = useState<User[]>([]);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // User group state
    const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
    const [groupName, setGroupName] = useState("");
    const [groupDescription, setGroupDescription] = useState("");

    // Dialog states
    const [addUserOpen, setAddUserOpen] = useState(false);
    const [addGroupOpen, setAddGroupOpen] = useState(false);
    const [editUserOpen, setEditUserOpen] = useState(false);
    const [editGroupOpen, setEditGroupOpen] = useState(false);

    // Edit states
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
    const [editUsername, setEditUsername] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editGroupName, setEditGroupName] = useState("");
    const [editGroupDescription, setEditGroupDescription] = useState("");

    // Manage group members state
    const [managingGroup, setManagingGroup] = useState<UserGroup | null>(null);
    const [groupMembers, setGroupMembers] = useState<User[]>([]);
    const [manageMembersOpen, setManageMembersOpen] = useState(false);
    const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<string[]>([]);

    // Active tab
    const [activeTab, setActiveTab] = useState<"users" | "groups">("users");

    // Fetch users
    const fetchUsers = async () => {
        try {
            const response = await api.get("/users");
            const usersData = response.data || [];
            console.log("UserData:", usersData)

            // Normalize user data and fetch groups
            const normalizedUsers = await Promise.all(usersData.map(async (u: any) => {
                // EXHAUSTIVE check for UUID fields
                const databaseId = u.user_id || u.u_id || u.userId || u.id || u.ID || "";
                const userId = String(databaseId).trim();
                const username = String(u.user_name || u.username || u.Name || u.Username || "Unknown User");
                const email = String(u.email || u.Email || "");

                let userGroups: string[] = [];
                if (userId) {
                    try {
                        const groupsResponse = await api.get(`/users/${userId}/groups`);
                        const groupsData = groupsResponse.data || [];
                        userGroups = groupsData.map((g: any) => {
                            if (typeof g === 'string') return g;
                            return String(g.ug_id || g.groupId || g.id || g.ID || "");
                        }).filter(Boolean);
                    } catch (e) {
                        console.error(`Error fetching groups for user ${userId}`, e);
                    }
                }

                return {
                    ...u,
                    userId,
                    username,
                    email,
                    userGroups
                };
            }));

            setUsers(normalizedUsers);
        } catch (error) {
            console.error("Error fetching users", error);
        }
    };

    // Fetch user groups
    const fetchUserGroups = async () => {
        try {
            const response = await api.get("/usergroups");
            const data = response.data || [];

            // Normalize group data to handle specific backend field names (ug_id, ug_name)
            const normalizedGroups = data.map((g: any) => ({
                groupId: String(g.ug_id || g.groupId || g.id || g.ID || (typeof g === 'string' ? g : "")),
                name: String(g.ug_name || g.name || g.Name || g.GroupName || (typeof g === 'string' ? g : "Unnamed Group")),
                description: g.description || g.Description || "",
            }));

            setUserGroups(normalizedGroups);
        } catch (error) {
            console.error("Error fetching user groups", error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchUserGroups();
    }, []);

    // Add new user
    const handleAddUser = async () => {
        if (!username || !email || !password) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            const response = await api.post("/users", {
                username,
                email,
                password,
            });

            if (response.status === 201) {
                alert("User added successfully");
                fetchUsers();
                setUsername("");
                setEmail("");
                setPassword("");
                setAddUserOpen(false);
            }
        } catch (error) {
            console.error(error);
            alert("Unable to add user. Please try again.");
        }
    };

    // Add new user group
    const handleAddUserGroup = async () => {
        if (!groupName) {
            alert("Please enter a group name");
            return;
        }

        try {
            const response = await api.post("/usergroups", {
                name: groupName,
                description: groupDescription,
            });

            if (response.status === 201) {
                alert("User group added successfully");
                fetchUserGroups();
                setGroupName("");
                setGroupDescription("");
                setAddGroupOpen(false);
            }
        } catch (error) {
            console.error(error);
            alert("Unable to add user group. Please try again.");
        }
    };

    // Edit user
    const handleOpenEditUser = async (user: User) => {
        setEditingUser(user);
        setEditUsername(user.username);
        setEditEmail(user.email);
        setEditUserOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        try {
            await api.put(`/users/${editingUser.userId}`, {
                username: editUsername,
                email: editEmail,
            });

            alert("User updated successfully");
            fetchUsers();
            setEditUserOpen(false);
            setEditingUser(null);
        } catch (error) {
            console.error(error);
            alert("Unable to update user. Please try again.");
        }
    };

    // Edit user group
    const handleOpenEditGroup = (group: UserGroup) => {
        setEditingGroup(group);
        setEditGroupName(group.name);
        setEditGroupDescription(group.description);
        setEditGroupOpen(true);
    };

    const handleUpdateGroup = async () => {
        if (!editingGroup) return;

        try {
            const response = await api.put(`/usergroups/${editingGroup.groupId}`, {
                name: editGroupName,
                description: editGroupDescription,
            });

            if (response.status === 200) {
                alert("User group updated successfully");
                fetchUserGroups();
                setEditGroupOpen(false);
                setEditingGroup(null);
            }
        } catch (error) {
            console.error(error);
            alert("Unable to update user group. Please try again.");
        }
    };

    // Delete user
    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            const response = await api.delete(`/users/${userId}`);
            if (response.status === 200) {
                alert("User deleted successfully");
                fetchUsers();
            }
        } catch (error) {
            console.error(error);
            alert("Unable to delete user. Please try again.");
        }
    };

    // Delete user group
    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm("Are you sure you want to delete this user group?")) return;

        try {
            const response = await api.delete(`/usergroups/${groupId}`);
            if (response.status === 200) {
                alert("User group deleted successfully");
                fetchUserGroups();
            }
        } catch (error) {
            console.error(error);
            alert("Unable to delete user group. Please try again.");
        }
    };

    // Manage Group Members
    const handleOpenManageMembers = async (group: UserGroup) => {
        setManagingGroup(group);
        setManageMembersOpen(true);
        try {
            const response = await api.get(`/usergroups/${group.groupId}/users`);
            const membersData = response.data || [];
            console.log("MembersData:", membersData)

            // Normalize member data to ensure they have userId
            const normalizedMembers = membersData.map((m: any) => {
                const databaseId = m.user_id || m.u_id || m.userId || m.id || m.ID || "";
                return {
                    ...m,
                    userId: String(databaseId).trim(),
                    username: String(m.user_name || m.username || m.Name || m.Username || "Unknown User"),
                    email: String(m.email || m.Email || "")
                };
            });

            setGroupMembers(normalizedMembers);
            setSelectedUsersForGroup([]);
        } catch (error) {
            console.error("Error fetching group members", error);
            // Don't alert here to avoid UX friction, just set to empty if it fails
            setGroupMembers([]);
            setSelectedUsersForGroup([]);
        }
    };

    const handleAddUsersToGroup = async () => {
        if (!managingGroup || selectedUsersForGroup.length === 0) return;

        // Final safety check: filter out any empty strings
        const validUserIds = selectedUsersForGroup.filter(id => id.trim() !== "");

        if (validUserIds.length === 0) {
            alert("No valid users selected.");
            return;
        }

        console.log("Sending Payload:", { endUserIds: validUserIds });

        try {
            await api.post(`/usergroups/${managingGroup.groupId}/users`, {
                endUserIds: validUserIds,
            });
            alert("Users added to group successfully");
            const response = await api.get(`/usergroups/${managingGroup.groupId}/users`);
            const refreshedMembers = response.data || [];

            // Re-normalize refreshed members
            const normalizedRefreshed = refreshedMembers.map((m: any) => ({
                ...m,
                userId: String(m.user_id || m.u_id || m.userId || m.id || m.ID || ""),
                username: String(m.user_name || m.username || m.Name || m.Username || ""),
                email: String(m.email || m.Email || "")
            }));

            setGroupMembers(normalizedRefreshed);
            setSelectedUsersForGroup([]);
            fetchUsers();
        } catch (error) {
            console.error("Error adding users to group", error);
            alert("Unable to add users to group.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
            <div className="max-w-7xl mx-auto p-8">
                {/* Header section */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                            User Management
                        </h1>
                        <p className="text-muted-foreground text-base">
                            Manage users and user groups for your application.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-border">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-6 py-3 font-semibold transition-all relative ${activeTab === "users"
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <UsersIcon className="w-5 h-5" />
                            Users
                        </div>
                        {activeTab === "users" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("groups")}
                        className={`px-6 py-3 font-semibold transition-all relative ${activeTab === "groups"
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <UsersRound className="w-5 h-5" />
                            User Groups
                        </div>
                        {activeTab === "groups" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                    </button>
                </div>

                {/* Users Tab */}
                {activeTab === "users" && (
                    <div>
                        <div className="flex justify-end mb-6">
                            <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                                <DialogTrigger asChild>
                                    <Button className="rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Add User
                                    </Button>
                                </DialogTrigger>

                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Add New User</DialogTitle>
                                        <DialogDescription>
                                            Create a new user account and assign user groups.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="username">Username *</Label>
                                            <Input
                                                id="username"
                                                placeholder="e.g. john_doe"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="user@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="password">Password *</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="Enter password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <Button onClick={handleAddUser}>Add User</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Users List */}
                        <div className="grid grid-cols-1 gap-4">
                            {users.length === 0 ? (
                                <div className="text-center py-12 bg-card/50 rounded-xl border border-border">
                                    <UsersIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-muted-foreground">No users found. Add your first user to get started.</p>
                                </div>
                            ) : (
                                users.map((user) => (
                                    <div
                                        key={user.userId}
                                        className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <UsersIcon className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-foreground">{user.username}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Mail className="w-3 h-3" />
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>

                                                {user.userGroups && user.userGroups.length > 0 && (
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <Shield className="w-4 h-4 text-muted-foreground" />
                                                        <div className="flex flex-wrap gap-2">
                                                            {user.userGroups.map((groupId) => {
                                                                const group = userGroups.find(g => g.groupId === groupId);
                                                                return (
                                                                    <Badge key={groupId} variant="secondary">
                                                                        {group?.name || groupId}
                                                                    </Badge>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenEditUser(user)}
                                                    className="rounded-lg"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteUser(user.userId)}
                                                    className="rounded-lg text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* User Groups Tab */}
                {activeTab === "groups" && (
                    <div>
                        <div className="flex justify-end mb-6">
                            <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
                                <DialogTrigger asChild>
                                    <Button className="rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                        <UsersRound className="w-4 h-4 mr-2" />
                                        Add User Group
                                    </Button>
                                </DialogTrigger>

                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Add New User Group</DialogTitle>
                                        <DialogDescription>
                                            Create a new user group to organize users.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="group-name">Group Name *</Label>
                                            <Input
                                                id="group-name"
                                                placeholder="e.g. Administrators"
                                                value={groupName}
                                                onChange={(e) => setGroupName(e.target.value)}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="group-description">Description</Label>
                                            <Input
                                                id="group-description"
                                                placeholder="Brief description of the group"
                                                value={groupDescription}
                                                onChange={(e) => setGroupDescription(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <Button onClick={handleAddUserGroup}>Add Group</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* User Groups List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {userGroups.length === 0 ? (
                                <div className="col-span-full text-center py-12 bg-card/50 rounded-xl border border-border">
                                    <UsersRound className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-muted-foreground">No user groups found. Add your first group to get started.</p>
                                </div>
                            ) : (
                                userGroups.map((group) => {
                                    const memberCount = users.filter(u => u.userGroups?.includes(group.groupId)).length;

                                    return (
                                        <div
                                            key={group.groupId}
                                            className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <UsersRound className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-foreground">{group.name}</h3>
                                                        <p className="text-sm text-muted-foreground">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenManageMembers(group)}
                                                        className="rounded-lg"
                                                        title="Manage Members"
                                                    >
                                                        <UsersIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenEditGroup(group)}
                                                        className="rounded-lg"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteGroup(group.groupId)}
                                                        className="rounded-lg text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {group.description && (
                                                <p className="text-sm text-muted-foreground">{group.description}</p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Edit User Dialog */}
                <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>
                                Update user information and group assignments.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-username">Username</Label>
                                <Input
                                    id="edit-username"
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleUpdateUser}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit User Group Dialog */}
                <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Edit User Group</DialogTitle>
                            <DialogDescription>
                                Update user group information.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-group-name">Group Name</Label>
                                <Input
                                    id="edit-group-name"
                                    value={editGroupName}
                                    onChange={(e) => setEditGroupName(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-group-description">Description</Label>
                                <Input
                                    id="edit-group-description"
                                    value={editGroupDescription}
                                    onChange={(e) => setEditGroupDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleUpdateGroup}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Manage Group Members Dialog */}
                <Dialog open={manageMembersOpen} onOpenChange={setManageMembersOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Manage Members: {managingGroup?.name}</DialogTitle>
                            <DialogDescription>
                                View current members and add new users to this group.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6">
                            {/* Current Members */}
                            <div className="grid gap-2">
                                <Label className="text-sm font-bold">Current Members ({groupMembers.length})</Label>
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {groupMembers.length === 0 ? (
                                            <p className="p-4 text-sm text-muted-foreground text-center">No members in this group.</p>
                                        ) : (
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Username</th>
                                                        <th className="px-4 py-2 text-left">Email</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {groupMembers.map((member) => (
                                                        <tr key={member.userId}>
                                                            <td className="px-4 py-2">{member.username}</td>
                                                            <td className="px-4 py-2 text-muted-foreground">{member.email}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Add More Users */}
                            <div className="grid gap-2">
                                <Label className="text-sm font-bold">Add Users</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <select
                                            multiple
                                            className="w-full h-32 p-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary"
                                            value={selectedUsersForGroup}
                                            onChange={(e) => {
                                                const values = Array.from(e.target.options)
                                                    .filter(opt => opt.selected)
                                                    .map(opt => opt.value);
                                                setSelectedUsersForGroup(values);
                                            }}
                                        >
                                            {users
                                                .filter(u => u.userId && !groupMembers.some(m => m.userId === u.userId))
                                                .map(u => (
                                                    <option key={u.userId} value={u.userId}>
                                                        {u.username} ({u.email || 'No Email'})
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    <Button
                                        onClick={handleAddUsersToGroup}
                                        disabled={selectedUsersForGroup.length === 0}
                                        className="self-end"
                                    >
                                        Add Selected
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Hold Ctrl (or Cmd) to select multiple users.</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
