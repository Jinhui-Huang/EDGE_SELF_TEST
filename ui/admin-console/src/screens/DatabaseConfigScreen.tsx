import { useEffect, useState } from "react";
import { translate } from "../i18n";
import { DatabaseConfig, DatabaseType, Locale, MutationState } from "../types";
import { MutationStatus } from "../ui-kit/MutationStatus";

type DatabaseConfigScreenProps = {
  navigationLabel?: string;
  title: string;
  hint: string;
  locale: Locale;
  databases: DatabaseConfig[];
  state: MutationState;
  testState: MutationState;
  onSave: (items: DatabaseConfig[]) => void;
  onTestConnection: (item: DatabaseConfig) => void;
};

type Copy = { en: string; zh: string; ja: string };
const copy = (en: string, zh = en, ja = en): Copy => ({ en, zh, ja });

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
  locale,
  databases,
  state,
  testState,
  onSave,
  onTestConnection
}: DatabaseConfigScreenProps) {
  const t = (value: Copy) => translate(locale, value);

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
            {t(copy("New database", "新建数据库", "新規データベース"))}
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
                  <span>{t(copy("Schema", "模式", "スキーマ"))}</span>
                  <strong>{item.schema || "-"}</strong>
                </div>
                <div className="databaseCardField">
                  <span>{t(copy("User", "用户", "ユーザー"))}</span>
                  <strong>{item.username || "-"}</strong>
                </div>
              </div>
              <div className="databaseCardFieldPair">
                <div className="databaseCardField">
                  <span>{t(copy("Driver", "驱动", "ドライバー"))}</span>
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
                {t(copy("Test connection", "测试连接", "接続テスト"))}
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
                <p className="eyebrow">
                  {editingId
                    ? t(copy("Edit database", "编辑数据库", "データベースを編集"))
                    : t(copy("Create database", "创建数据库", "データベースを作成"))}
                </p>
                <h3>
                  {editingId
                    ? t(copy("Update database config", "更新数据库配置", "データベース設定を更新"))
                    : t(copy("New database config", "新建数据库配置", "新規データベース設定"))}
                </h3>
              </div>
              <button type="button" className="projectsActionButton" onClick={closeDialog}>
                {t(copy("Close", "关闭", "閉じる"))}
              </button>
            </div>

            <div className="databaseDialogBody">
              <div className="databaseDialogGrid">
                <label>
                  {t(copy("Database name", "数据库名称", "データベース名"))}
                  <input
                    placeholder={t(copy("Example: oracle-main-trade", "示例：oracle-main-trade", "例：oracle-main-trade"))}
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                  />
                </label>
                <label>
                  {t(copy("Database type", "数据库类型", "データベース種別"))}
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
                  {t(copy("Username", "用户名", "ユーザー名"))}
                  <input
                    placeholder={t(copy("Example: qa_reader", "示例：qa_reader", "例：qa_reader"))}
                    value={form.username}
                    onChange={(event) => updateForm("username", event.target.value)}
                  />
                </label>
                <label>
                  {t(copy("Password", "密码", "パスワード"))}
                  <input
                    type="password"
                    placeholder={t(copy("Input database password", "输入数据库密码", "データベースパスワードを入力"))}
                    value={form.password}
                    onChange={(event) => updateForm("password", event.target.value)}
                  />
                </label>
                <label>
                  {t(copy("Driver", "驱动类名", "ドライバークラス名"))}
                  <input
                    placeholder={t(copy("Example: oracle.jdbc.OracleDriver", "示例：oracle.jdbc.OracleDriver", "例：oracle.jdbc.OracleDriver"))}
                    value={form.driver}
                    onChange={(event) => updateForm("driver", event.target.value)}
                  />
                </label>
                <label>
                  {t(copy("Schema", "数据库模式", "スキーマ"))}
                  <input
                    placeholder={t(copy("Example: CHECKOUT_APP", "示例：CHECKOUT_APP", "例：CHECKOUT_APP"))}
                    value={form.schema}
                    onChange={(event) => updateForm("schema", event.target.value)}
                  />
                </label>
                <label>
                  {t(copy("MyBatis env", "MyBatis 环境", "MyBatis 環境"))}
                  <input
                    placeholder={t(copy("Example: qa-oracle", "示例：qa-oracle", "例：qa-oracle"))}
                    value={form.mybatisEnv}
                    onChange={(event) => updateForm("mybatisEnv", event.target.value)}
                  />
                </label>
                <label>
                  {t(copy("Note", "备注", "メモ"))}
                  <input
                    placeholder={t(copy("Example: Checkout staging primary database", "示例：Checkout staging 主数据库", "例：チェックアウト ステージング メインDB"))}
                    value={form.note}
                    onChange={(event) => updateForm("note", event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="databaseDialogActions">
              <button type="button" className="projectsActionButton" onClick={() => onTestConnection(form)}>
                {t(copy("Test connection", "测试连接", "接続テスト"))}
              </button>
              {editingId ? (
                <button type="button" className="projectsActionButton danger" onClick={deleteCurrent}>
                  {t(copy("Delete", "删除", "削除"))}
                </button>
              ) : null}
              <button type="button" className="projectsActionButton primary" onClick={saveDialog}>
                {t(copy("Save database", "保存数据库", "データベースを保存"))}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
