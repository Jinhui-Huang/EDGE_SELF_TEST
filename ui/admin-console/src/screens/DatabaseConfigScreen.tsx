import { useEffect, useState } from "react";
import { DatabaseConfig, DatabaseType, MutationState } from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type DatabaseConfigScreenProps = {
  navigationLabel?: string;
  title: string;
  hint: string;
  databases: DatabaseConfig[];
  state: MutationState;
  testState: MutationState;
  onSave: (items: DatabaseConfig[]) => void;
  onTestConnection: (item: DatabaseConfig) => void;
};

const databaseTypes: DatabaseType[] = ["Oracle", "MySQL", "PostgreSQL", "SQL Server", "MariaDB", "DB2"];

const emptyDatabase = (): DatabaseConfig => ({
  id: "",
  name: "",
  type: "Oracle",
  driver: "",
  url: "",
  schema: "",
  username: "",
  password: "",
  mybatisEnv: "",
  note: ""
});

export function DatabaseConfigScreen({
  navigationLabel,
  title,
  hint,
  databases,
  state,
  testState,
  onSave,
  onTestConnection
}: DatabaseConfigScreenProps) {
  const [drafts, setDrafts] = useState<DatabaseConfig[]>(databases);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DatabaseConfig>(emptyDatabase());

  useEffect(() => {
    setDrafts(databases);
  }, [databases]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyDatabase());
    setDialogOpen(true);
  }

  function openEditDialog(item: DatabaseConfig) {
    setEditingId(item.id);
    setForm(item);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyDatabase());
  }

  function updateForm<K extends keyof DatabaseConfig>(key: K, value: DatabaseConfig[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveDialog() {
    const normalized: DatabaseConfig = {
      ...form,
      id: form.id || `db-${Date.now()}`,
      name: form.name.trim(),
      driver: form.driver.trim(),
      url: form.url.trim(),
      schema: form.schema.trim(),
      username: form.username.trim(),
      password: form.password,
      mybatisEnv: form.mybatisEnv.trim(),
      note: form.note.trim()
    };

    const nextDrafts = editingId
      ? drafts.map((item) => (item.id === editingId ? normalized : item))
      : [...drafts, normalized];

    setDrafts(nextDrafts);
    onSave(nextDrafts);
    closeDialog();
  }

  function deleteCurrent() {
    if (!editingId) {
      return;
    }
    const nextDrafts = drafts.filter((item) => item.id !== editingId);
    setDrafts(nextDrafts);
    onSave(nextDrafts);
    closeDialog();
  }

  return (
    <section className="databaseConfigScreen">
      <div className="sectionHeader databaseConfigHeader">
        <div>
          <p className="eyebrow">{navigationLabel}</p>
          <h3>{title}</h3>
        </div>
        <div className="databaseConfigHeaderActions">
          <span className="actionHint">{hint}</span>
          <button type="button" className="projectsActionButton primary" onClick={openCreateDialog}>
            New database
          </button>
        </div>
      </div>

      <div className="databaseConfigGrid">
        {drafts.map((item) => (
          <article key={item.id} className="databaseCard" onClick={() => openEditDialog(item)} role="button" tabIndex={0}>
            <div className="databaseCardHead">
              <div className="databaseCardTitleWrap">
                <strong className="databaseCardTitle" title={item.name}>
                  {item.name}
                </strong>
                <span className="databaseCardType">{item.type}</span>
              </div>
            </div>

            <div className="databaseCardBody">
              <div className="databaseCardField">
                <span>URL</span>
                <strong title={item.url}>{item.url}</strong>
              </div>
              <div className="databaseCardFieldPair">
                <div className="databaseCardField">
                  <span>Schema</span>
                  <strong>{item.schema || "-"}</strong>
                </div>
                <div className="databaseCardField">
                  <span>User</span>
                  <strong>{item.username || "-"}</strong>
                </div>
              </div>
              <div className="databaseCardFieldPair">
                <div className="databaseCardField">
                  <span>Driver</span>
                  <strong title={item.driver}>{item.driver || "-"}</strong>
                </div>
                <div className="databaseCardField">
                  <span>MyBatis</span>
                  <strong>{item.mybatisEnv || "-"}</strong>
                </div>
              </div>
            </div>

            <div className="databaseCardActions">
              <button
                type="button"
                className="projectsActionButton"
                onClick={(event) => {
                  event.stopPropagation();
                  onTestConnection(item);
                }}
              >
                Test connection
              </button>
            </div>
          </article>
        ))}
      </div>

      <MutationStatus state={state} />
      <MutationStatus state={testState} />

      {dialogOpen ? (
        <div className="databaseDialogBackdrop" onClick={closeDialog}>
          <div className="databaseDialog" onClick={(event) => event.stopPropagation()}>
            <div className="databaseDialogHead">
              <div>
                <p className="eyebrow">{editingId ? "Edit database" : "Create database"}</p>
                <h3>{editingId ? "Update database config" : "New database config"}</h3>
              </div>
              <button type="button" className="projectsActionButton" onClick={closeDialog}>
                Close
              </button>
            </div>

            <div className="databaseDialogBody">
              <div className="databaseDialogGrid">
                <label>
                  Database name
                  <input
                    placeholder="Example: oracle-main-trade"
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                  />
                </label>
                <label>
                  Database type
                  <select value={form.type} onChange={(event) => updateForm("type", event.target.value as DatabaseType)}>
                    {databaseTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fullWidth">
                  JDBC URL
                  <input
                    placeholder="Example: jdbc:oracle:thin:@//10.10.0.12:1521/ORCLPDB1"
                    value={form.url}
                    onChange={(event) => updateForm("url", event.target.value)}
                  />
                </label>
                <label>
                  Username
                  <input
                    placeholder="Example: qa_reader"
                    value={form.username}
                    onChange={(event) => updateForm("username", event.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    placeholder="Input database password"
                    value={form.password}
                    onChange={(event) => updateForm("password", event.target.value)}
                  />
                </label>
                <label>
                  Driver
                  <input
                    placeholder="Example: oracle.jdbc.OracleDriver"
                    value={form.driver}
                    onChange={(event) => updateForm("driver", event.target.value)}
                  />
                </label>
                <label>
                  Schema
                  <input
                    placeholder="Example: CHECKOUT_APP"
                    value={form.schema}
                    onChange={(event) => updateForm("schema", event.target.value)}
                  />
                </label>
                <label>
                  MyBatis env
                  <input
                    placeholder="Example: qa-oracle"
                    value={form.mybatisEnv}
                    onChange={(event) => updateForm("mybatisEnv", event.target.value)}
                  />
                </label>
                <label>
                  Note
                  <input
                    placeholder="Example: Checkout staging primary database"
                    value={form.note}
                    onChange={(event) => updateForm("note", event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="databaseDialogActions">
              <button type="button" className="projectsActionButton" onClick={() => onTestConnection(form)}>
                Test connection
              </button>
              {editingId ? (
                <button type="button" className="projectsActionButton danger" onClick={deleteCurrent}>
                  Delete
                </button>
              ) : null}
              <button type="button" className="projectsActionButton primary" onClick={saveDialog}>
                Save database
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
