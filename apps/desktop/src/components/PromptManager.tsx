import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Tag,
} from "lucide-react";
import { cn } from "@zentrail/ui";
import { useAi } from "../state/aiStore";
import { templateCategories } from "@zentrail/ai";
import type { PromptTemplate } from "@zentrail/ai";

/** Prompt template management sub-panel. */
export function PromptManager() {
  const templates = useAi((s) => s.templates);
  const saveTemplate = useAi((s) => s.saveTemplate);
  const deleteTemplate = useAi((s) => s.deleteTemplate);
  const [category, setCategory] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [body, setBody] = useState("");
  const [cat, setCat] = useState("general");

  const filtered =
    category === "all" ? templates : templates.filter((t) => t.category === category);
  const categories = templateCategories(templates);

  const handleAdd = () => {
    if (!name.trim() || !body.trim()) return;
    void saveTemplate({
      id: crypto.randomUUID(),
      name: name.trim(),
      description: desc.trim(),
      body: body.trim(),
      category: cat.trim() || "general",
      builtIn: false,
    });
    setName("");
    setDesc("");
    setBody("");
    setCat("general");
    setAdding(false);
  };

  const startEdit = (t: PromptTemplate) => {
    setEditing(t.id);
    setName(t.name);
    setDesc(t.description);
    setBody(t.body);
    setCat(t.category);
  };

  const handleUpdate = () => {
    if (!editing || !name.trim() || !body.trim()) return;
    const existing = templates.find((t) => t.id === editing);
    void saveTemplate({
      ...existing!,
      name: name.trim(),
      description: desc.trim(),
      body: body.trim(),
      category: cat.trim() || "general",
    });
    setEditing(null);
    setName("");
    setDesc("");
    setBody("");
    setCat("general");
  };

  const cancelEdit = () => {
    setEditing(null);
    setName("");
    setDesc("");
    setBody("");
    setCat("general");
    setAdding(false);
  };

  return (
    <div className="ai__prompts">
      <div className="ai__section-head">
        <span>Prompt Templates ({templates.length})</span>
        {!adding && !editing && (
          <button
            className="iconbtn"
            type="button"
            title="New template"
            onClick={() => setAdding(true)}
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      <div className="ai__prompt-cats">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={cn("ai__cat-btn", category === c && "is-active")}
            onClick={() => setCategory(c)}
          >
            <Tag size={10} /> {c}
          </button>
        ))}
      </div>

      {(adding || editing) && (
        <div className="ai__prompt-form">
          <input
            className="ai__input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="ai__input"
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            className="ai__input"
            placeholder="Category"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          />
          <textarea
            className="ai__textarea"
            placeholder="Template body (use {{variable}} placeholders)"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="ai__form-actions">
            <button
              className="btn btn--primary"
              type="button"
              disabled={!name.trim() || !body.trim()}
              onClick={editing ? handleUpdate : handleAdd}
            >
              <Check size={12} /> {editing ? "Update" : "Add"}
            </button>
            <button className="btn" type="button" onClick={cancelEdit}>
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}

      <ul className="ai__prompt-list">
        {filtered.map((t) => (
          <li key={t.id} className="ai__prompt-row">
            <div className="ai__prompt-info">
              <span className="ai__prompt-name">{t.name}</span>
              <span className="muted ai__prompt-desc">{t.description}</span>
              <span className="ai__prompt-cat">
                <Tag size={9} /> {t.category}
                {t.builtIn && <span className="ai__badge">built-in</span>}
              </span>
            </div>
            <div className="ai__prompt-actions">
              <button
                className="iconbtn"
                type="button"
                title="Edit"
                onClick={() => startEdit(t)}
              >
                <Edit3 size={11} />
              </button>
              {!t.builtIn && (
                <button
                  className="iconbtn"
                  type="button"
                  title="Delete"
                  onClick={() => void deleteTemplate(t.id)}
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
