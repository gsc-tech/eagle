import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

interface AddBackendProps {
  onSave: (data: { name: string; url: string }) => void;
}

export default function AddBackend({ onSave }: AddBackendProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    onSave({ name, url });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Backend Name</Label>
        <Input
          placeholder="e.g., Financial Data API"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <Label>API URL</Label>
        <Input
          placeholder="https://api.example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <Button className="w-full" onClick={handleSubmit}>Add Backend</Button>
    </div>
  );
}
