import BackendCard from "@/components/backend-card";
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
import { api } from "../utils/apiClient"
import axios from "axios";


type Backend = {
  backendId: string,
  name: string,
  status: string,
  backendUrl: string
}

export default function Backends() {
  const [backendName, setBackendName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [backendsData, setBackendsData] = useState<Backend[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingBackend, setEditingBackend] = useState<Backend | null>(null);
  const [editBackendName, setEditBackendName] = useState("");
  const [editApiUrl, setEditApiUrl] = useState("");


  const fetchBackends = async () => {
    try {
      const response = await api.get("/backend", { timeout: 1000 });
      const data = response.data;
      console.log(response.data);

      const checkedBackends = await Promise.all(
        data.map(async (backend: any) => {
          try {
            const res = await axios.get(`${backend.backendUrl}/widgets`, { timeout: 500 });
            console.log("backend url res", res)
            return { ...backend, status: res.status == 200 ? "connected" : "disconnected" }
          } catch (error) {
            return { ...backend, status: "disconnected" }
          }
        })
      )

      console.log(checkedBackends)

      setBackendsData(checkedBackends)
    } catch (error) {
      console.error("Error fetching the data", error);
    }
  }

  useEffect(() => {
    fetchBackends()
  }, [])

  const [isAddBackendOpen, setIsAddBackendOpen] = useState(false);

  const handleAddBackend = async () => {
    try {
      const response = await api.post("/backend/connect", {
        name: backendName,
        backendUrl: apiUrl
      })
      if (response.status == 201) {
        alert("All Widgets loaded successfully");
        fetchBackends();
        setIsAddBackendOpen(false);
      }
    } catch (error: any) {
      console.error(error)
      alert(`Unable to connect the backend: ${error.response.data.error}`);
    }
    setBackendName("");
    setApiUrl("");
  };

  const checkBackend = async (backend: Backend) => {
    var isBackendConnected = false;
    try {
      const response = await axios.get(`${backend.backendUrl}/widgets`, { timeout: 500 });
      console.log("backend url res", response)
      console.log(response.data);
      setBackendsData((prev) =>
        prev.map((backend) =>
          backend.backendId === backend.backendId
            ? { ...backend, status: response.status == 200 ? "connected" : "disconnected" }
            : backend
        )
      );
      isBackendConnected = response.status == 200;
    } catch (error) {
      setBackendsData((prev) =>
        prev.map((backend) =>
          backend.backendId === backend.backendId
            ? { ...backend, status: "disconnected" }
            : backend
        )
      );
    }
    return isBackendConnected;
  }

  const refreshWidgets = async (backend: Backend) => {
    try {
      const response = await api.put("backend/widgetRefresh", {
        backendId: backend.backendId,
        backendUrl: backend.backendUrl
      })
      console.log(response)
    } catch (error: any) {
      console.error(error)
      throw error;
    }
  }

  const refreshBackend = async (backend: Backend) => {
    try {
      const isBackendConnected = await checkBackend(backend)
      if (isBackendConnected) {
        await refreshWidgets(backend)
        alert("Backend Refreshed Successfully");
      } else {
        alert("Unable to refresh: Backend is disconnected");
      }
    } catch (error: any) {
      console.error(error)
      const errorMessage = error.response.data.error;
      alert(`Unable to refresh the backend: ${errorMessage}`);
    }
  }

  const handleOpenSettings = (backend: Backend) => {
    setEditingBackend(backend);
    setEditBackendName(backend.name);
    setEditApiUrl(backend.backendUrl);
    setSettingsOpen(true);
  };

  const handleUpdateBackend = async () => {
    if (!editingBackend) return;

    try {
      const response = await api.put(`/backend/${editingBackend.backendId}`, {
        name: editBackendName,
        backendUrl: editApiUrl
      });

      if (response.status === 200) {
        alert("Backend updated successfully");

        setBackendsData((prev) =>
          prev.map((backend) =>
            backend.name === editingBackend.name
              ? { ...backend, name: editBackendName, backendUrl: editApiUrl }
              : backend
          )
        );

        setSettingsOpen(false);
        setEditingBackend(null);
      }
    } catch (error) {
      console.error(error);
      alert("Unable to update the backend. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="max-w-7xl mx-auto p-8">
        {/*Header section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Backends
            </h1>
            <p className="text-muted-foreground text-base">
              Connect and manage your backend services.
            </p>
          </div>

          <Dialog open={isAddBackendOpen} onOpenChange={setIsAddBackendOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                + Add Backend
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Backend</DialogTitle>
                <DialogDescription>
                  Connect a new backend to your developer console.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="backend-name">Backend Name</Label>
                  <Input
                    id="backend-name"
                    placeholder="e.g. Financial Data API"
                    value={backendName}
                    onChange={(e) => setBackendName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="api-url">API URL</Label>
                  <Input
                    id="api-url"
                    placeholder="https://api.example.com"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>

                <Button onClick={handleAddBackend}>Add Backend</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* //TODO: add success toast message. */}
        </div>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Backend Settings</DialogTitle>
              <DialogDescription>
                Update the backend name and URL.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-backend-name">Backend Name</Label>
                <Input
                  id="edit-backend-name"
                  placeholder="e.g. Financial Data API"
                  value={editBackendName}
                  onChange={(e) => setEditBackendName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-api-url">API URL</Label>
                <Input
                  id="edit-api-url"
                  placeholder="https://api.example.com"
                  value={editApiUrl}
                  onChange={(e) => setEditApiUrl(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>

              <Button onClick={handleUpdateBackend}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {backendsData.map((backend, index) => (
            <BackendCard
              key={index}
              name={backend.name}
              status={backend.status as "connected" | "disconnected"}
              url={backend.backendUrl}
              onSettings={() => handleOpenSettings(backend)}
              onDelete={() => console.log(`Delete ${backend.name}`)}
              onRefresh={() => refreshBackend(backend)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
