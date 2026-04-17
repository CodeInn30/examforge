"use client";

import { useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Option {
  id?: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  marks: number;
  orderIndex: number;
  explanation?: string;
  options: (Option & { id: string })[];
}

interface QuestionEditorProps {
  examId: string;
  questions: Question[];
  onUpdate: (questions: Question[]) => void;
}

// ── Shared option row used in both add form and edit form ─────────────────────
function OptionRow({
  opt,
  index,
  onToggle,
  onChange,
  onRemove,
}: {
  opt: Option;
  index: number;
  onToggle: () => void;
  onChange: (val: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onToggle}
        title={opt.isCorrect ? "Correct answer" : "Mark as correct"}
        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          opt.isCorrect
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-input bg-background hover:border-emerald-400"
        }`}
      >
        {opt.isCorrect && <Check size={11} />}
      </button>
      <Input
        value={opt.optionText}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Option ${index + 1}`}
        className="flex-1 h-8 text-sm"
      />
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Sortable question card ────────────────────────────────────────────────────
function SortableQuestion({
  question,
  index,
  examId,
  onDelete,
  onSaved,
}: {
  question: Question;
  index: number;
  examId: string;
  onDelete: (id: string) => void;
  onSaved: (q: Question) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: question.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.questionText);
  const [marks, setMarks] = useState(String(question.marks));
  const [type, setType] = useState(question.questionType);
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [options, setOptions] = useState<Option[]>(question.options);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addOption() {
    setOptions((o) => [...o, { optionText: "", isCorrect: false, orderIndex: o.length }]);
  }

  function removeOption(i: number) {
    setOptions((o) =>
      o.filter((_, idx) => idx !== i).map((opt, idx) => ({ ...opt, orderIndex: idx }))
    );
  }

  function toggleCorrect(i: number) {
    setOptions((o) =>
      o.map((opt, idx) => {
        if (type === "single_choice") return { ...opt, isCorrect: idx === i };
        return idx === i ? { ...opt, isCorrect: !opt.isCorrect } : opt;
      })
    );
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const res = await apiFetch(`/api/admin/exams/${examId}/questions/${question.id}`, {
      method: "PATCH",
      json: {
        questionText: text,
        marks: Number(marks),
        questionType: type,
        explanation: explanation || undefined,
        options: options.map((o, i) => ({ ...o, orderIndex: i })),
      },
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed");
    } else {
      onSaved(data.question);
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this question?")) return;
    const res = await apiFetch(`/api/admin/exams/${examId}/questions/${question.id}`, {
      method: "DELETE",
    });
    if (res.ok) onDelete(question.id);
  }

  const typeBadgeClass =
    question.questionType === "single_choice"
      ? "bg-blue-100 text-blue-700"
      : "bg-violet-100 text-violet-700";

  return (
    <div ref={setNodeRef} style={style} className="bg-card border rounded-xl overflow-hidden">
      {/* Card header — always visible */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        {/* Question number badge */}
        <span className="w-6 h-6 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        {/* Question text preview */}
        <p className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
          {question.questionText}
        </p>

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
            {question.marks}pt{Number(question.marks) !== 1 ? "s" : ""}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadgeClass}`}>
            {question.questionType === "single_choice" ? "Single" : "Multi"}
          </span>
        </div>

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        )}
      </div>

      {/* Collapsed view: options list */}
      {!editing && (
        <div className="px-4 py-3 space-y-1.5">
          {question.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2 text-sm">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  opt.isCorrect ? "bg-emerald-500" : "bg-muted border border-input"
                }`}
              >
                {opt.isCorrect && <Check size={9} className="text-white" />}
              </div>
              <span className={opt.isCorrect ? "text-emerald-700 font-medium" : "text-muted-foreground"}>
                {opt.optionText}
              </span>
            </div>
          ))}
          {question.explanation && (
            <p className="text-xs text-muted-foreground mt-2 italic pt-2 border-t">
              Explanation: {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Question Text</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Question text"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-sm border border-input rounded-md px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="single_choice">Single Choice</option>
                <option value="multiple_choice">Multiple Choice</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Marks</Label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              Options{" "}
              <span className="text-muted-foreground font-normal">
                (click circle to mark correct)
              </span>
            </Label>
            {options.map((opt, i) => (
              <OptionRow
                key={i}
                opt={opt}
                index={i}
                onToggle={() => toggleCorrect(i)}
                onChange={(val) =>
                  setOptions((o) => o.map((x, idx) => (idx === i ? { ...x, optionText: val } : x)))
                }
                onRemove={() => removeOption(i)}
              />
            ))}
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addOption}>
              <Plus size={11} className="mr-1" /> Add Option
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Explanation{" "}
              <span className="text-muted-foreground font-normal">(shown after exam if review enabled)</span>
            </Label>
            <Input
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Optional explanation for the correct answer"
              className="h-9"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/8 border border-destructive/20 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Question"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add question form ─────────────────────────────────────────────────────────
interface AddQuestionFormProps {
  examId: string;
  onAdded: (q: Question) => void;
}

function AddQuestionForm({ examId, onAdded }: AddQuestionFormProps) {
  const [text, setText] = useState("");
  const [marks, setMarks] = useState("1");
  const [type, setType] = useState("single_choice");
  const [options, setOptions] = useState<Option[]>([
    { optionText: "", isCorrect: false, orderIndex: 0 },
    { optionText: "", isCorrect: false, orderIndex: 1 },
    { optionText: "", isCorrect: false, orderIndex: 2 },
    { optionText: "", isCorrect: false, orderIndex: 3 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleCorrect(i: number) {
    setOptions((o) =>
      o.map((opt, idx) =>
        type === "single_choice"
          ? { ...opt, isCorrect: idx === i }
          : idx === i
          ? { ...opt, isCorrect: !opt.isCorrect }
          : opt
      )
    );
  }

  async function handleAdd() {
    setError("");
    const validOptions = options.filter((o) => o.optionText.trim());
    if (!text.trim()) { setError("Question text is required"); return; }
    if (validOptions.length < 2) { setError("At least 2 options required"); return; }
    if (!validOptions.some((o) => o.isCorrect)) { setError("Mark at least one correct option"); return; }

    setSaving(true);
    const res = await apiFetch(`/api/admin/exams/${examId}/questions`, {
      method: "POST",
      json: {
        questionText: text,
        questionType: type,
        marks: Number(marks),
        options: validOptions.map((o, i) => ({ ...o, orderIndex: i })),
      },
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to add");
    } else {
      onAdded(data.question);
      setText("");
      setOptions([
        { optionText: "", isCorrect: false, orderIndex: 0 },
        { optionText: "", isCorrect: false, orderIndex: 1 },
        { optionText: "", isCorrect: false, orderIndex: 2 },
        { optionText: "", isCorrect: false, orderIndex: 3 },
      ]);
    }
  }

  return (
    <div className="border-2 border-dashed border-border rounded-xl p-5 space-y-4 bg-muted/20 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <Plus size={13} className="text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Add Question</h3>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter question text…"
        rows={2}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Type</Label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full text-sm border border-input rounded-md px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="single_choice">Single Choice</option>
            <option value="multiple_choice">Multiple Choice</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Marks</Label>
          <Input
            type="number"
            min={0.5}
            step={0.5}
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">
          Options{" "}
          <span className="text-muted-foreground font-normal">(click circle to mark correct)</span>
        </Label>
        {options.map((opt, i) => (
          <OptionRow
            key={i}
            opt={opt}
            index={i}
            onToggle={() => toggleCorrect(i)}
            onChange={(val) =>
              setOptions((o) => o.map((x, idx) => (idx === i ? { ...x, optionText: val } : x)))
            }
            onRemove={() =>
              setOptions((o) =>
                o.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, orderIndex: idx }))
              )
            }
          />
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() =>
            setOptions((o) => [...o, { optionText: "", isCorrect: false, orderIndex: o.length }])
          }
        >
          <Plus size={11} className="mr-1" /> Add Option
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/8 border border-destructive/20 px-3 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <Button size="sm" onClick={handleAdd} disabled={saving}>
        {saving ? "Adding…" : "Add Question"}
      </Button>
    </div>
  );
}

// ── CSV Import (collapsible) ──────────────────────────────────────────────────
function BulkImportButton({
  examId,
  onImported,
}: {
  examId: string;
  onImported: (questions: Question[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors?: string[];
    detectedHeaders?: string[];
  } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);

    const form = new FormData();
    form.append("file", file);

    const res = await apiFetch(`/api/admin/exams/${examId}/questions/import`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);

    if (fileRef.current) fileRef.current.value = "";

    if (!res.ok) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [...(data.details ?? []), data.error ?? "Import failed"],
        detectedHeaders: data.detectedHeaders,
      });
      return;
    }

    setResult({ imported: data.imported, skipped: data.skipped, errors: data.errors });
    onImported(data.questions);
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Upload size={14} className="text-muted-foreground" />
          Import Questions from CSV
        </div>
        {open ? (
          <ChevronUp size={15} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={15} className="text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-3 border-t">
          <p className="text-xs text-muted-foreground">
            Upload a <strong>CSV</strong> or <strong>XLSX</strong> file with columns:{" "}
            <code className="bg-muted px-1 py-0.5 rounded">Question</code>,{" "}
            <code className="bg-muted px-1 py-0.5 rounded">Option A</code>{" "}…{" "}
            <code className="bg-muted px-1 py-0.5 rounded">Option D</code>,{" "}
            <code className="bg-muted px-1 py-0.5 rounded">Correct Answer</code> (A / B / C / D).
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={13} className="mr-2" />
            {loading ? "Importing…" : "Choose CSV / XLSX"}
          </Button>

          {result && (
            <>
              {result.imported > 0 && (
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  {result.imported} question{result.imported !== 1 ? "s" : ""} imported
                  {result.skipped > 0
                    ? `, ${result.skipped} row${result.skipped !== 1 ? "s" : ""} skipped`
                    : ""}
                  .
                </div>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="text-sm text-destructive bg-destructive/8 border border-destructive/20 px-3 py-2.5 rounded-lg flex flex-col gap-1">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{e}</span>
                    </div>
                  ))}
                  {result.detectedHeaders && result.detectedHeaders.length > 0 && (
                    <p className="mt-1 text-xs opacity-70 pl-5">
                      Detected columns: {result.detectedHeaders.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function QuestionEditor({ examId, questions: initialQ, onUpdate }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQ);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(questions, oldIndex, newIndex);
    setQuestions(reordered);
    onUpdate(reordered);

    await apiFetch(`/api/admin/exams/${examId}/questions/reorder`, {
      method: "PATCH",
      json: { questionIds: reordered.map((q) => q.id) },
    });
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <SortableQuestion
                key={q.id}
                question={q}
                index={i}
                examId={examId}
                onDelete={(id) => {
                  const updated = questions.filter((x) => x.id !== id);
                  setQuestions(updated);
                  onUpdate(updated);
                }}
                onSaved={(updated) => {
                  const list = questions.map((x) => (x.id === updated.id ? updated : x));
                  setQuestions(list);
                  onUpdate(list);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {questions.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          No questions yet. Add your first question below.
        </p>
      )}

      <BulkImportButton
        examId={examId}
        onImported={(imported) => {
          const updated = [...questions, ...imported];
          setQuestions(updated);
          onUpdate(updated);
        }}
      />

      <AddQuestionForm
        examId={examId}
        onAdded={(q) => {
          const updated = [...questions, q];
          setQuestions(updated);
          onUpdate(updated);
        }}
      />
    </div>
  );
}
