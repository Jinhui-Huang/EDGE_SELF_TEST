import { useEffect, useState } from "react";
import { translate } from "../i18n";
import {
  AdminConsoleSnapshot,
  DataDiffResponse,
  DataDiffRow,
  Locale,
  RawDataDiffResponse,
  RestoreRetryResponse,
  RestoreResultResponse
} from "../types";
import { ReportViewModel, selectReportViewModel } from "./reportViewModel";

type DataDiffScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
  selectedRunId: string | null;
  apiBaseUrl: string;
};

type RawJsonDrawerTab = "before" | "after" | "afterRestore";

type LocalizedCopy = { en: string; zh: string; ja: string };

function copy(en: string, zh: string, ja: string): LocalizedCopy {
  return { en, zh, ja };
}

function l(locale: Locale, c: LocalizedCopy) {
  return translate(locale, c);
}

/* ── Localized copy constants ── */
const C = {
  dataComparison: copy("Data comparison", "数据对比", "データ比較"),
  noRunSelected: copy("No run selected", "未选择运行", "実行未選択"),
  loadingDiff: copy("Loading diff...", "正在加载差异...", "差分を読み込み中..."),
  reports: copy("Reports", "报告", "レポート"),
  dataDiff: copy("Data diff", "数据差异", "データ差分"),
  dataDiffTitle: copy("Data diff - orders & inventory", "数据差异 - 订单 & 库存", "データ差分 - 注文 & 在庫"),
  db: copy("DB", "数据库", "DB"),
  project: copy("Project", "项目", "プロジェクト"),
  caseLbl: copy("Case", "用例", "ケース"),
  viewRawJson: copy("View raw JSON", "查看原始 JSON", "生の JSON を表示"),
  reRestore: copy("Re-restore", "重新恢复", "再リストア"),
  loading: copy("Loading...", "加载中...", "読み込み中..."),
  restoring: copy("Restoring...", "恢复中...", "リストア中..."),
  restoreAccepted: copy("Restore retry accepted", "恢复重试已接受", "リストアリトライ受理"),
  restoreRejected: copy("Restore retry rejected", "恢复重试已拒绝", "リストアリトライ拒否"),
  restoreFailed: copy("Restore retry failed", "恢复重试失败", "リストアリトライ失敗"),
  restoreResult: copy("Restore result", "恢复结果", "リストア結果"),
  noRestoreResult: copy("No restore result available", "无可用恢复结果", "リストア結果なし"),
  expectedChanges: copy("Expected changes", "预期变更", "予期される変更"),
  unexpected: copy("Unexpected", "非预期", "予期外"),
  restored: copy("Restored", "已恢复", "リストア済"),
  tablesAffected: copy("Tables affected", "影响表数", "影響テーブル数"),
  exp: copy("exp", "预期", "予期"),
  unexp: copy("unexp", "非预期", "予期外"),
  rawDiffJson: copy("Raw diff JSON", "原始差异 JSON", "生の差分 JSON"),
  close: copy("Close", "关闭", "閉じる"),
  loadingRawData: copy("Loading raw data...", "正在加载原始数据...", "生データ読み込み中..."),
  failedToLoadRawDiff: copy("Failed to load raw diff", "加载原始差异失败", "生の差分の読み込みに失敗"),
  before: copy("Before", "变更前", "変更前"),
  after: copy("After", "变更后", "変更後"),
  afterRestore: copy("After restore", "恢复后", "リストア後"),
};

function makeFallbackDiffRows(report: ReportViewModel): DataDiffRow[] {
  const failed = /fail/i.test(report.status);
  const infoOnly = /info/i.test(report.status);
  return [
    { table: "orders", pk: "ord_8821", field: "status", before: "null", after: failed ? "\"pending\"" : "\"paid\"", afterRestore: infoOnly ? (failed ? "\"pending\"" : "\"paid\"") : "null", expected: true, restored: !infoOnly },
    { table: "orders", pk: "ord_8821", field: "total_cents", before: "null", after: "8910", afterRestore: infoOnly ? "8910" : "null", expected: true, restored: !infoOnly },
    { table: "order_items", pk: "oi_9104", field: "(row)", before: "-", after: "inserted", afterRestore: "-", expected: true, restored: true },
    { table: "order_items", pk: "oi_9105", field: "(row)", before: "-", after: "inserted", afterRestore: "-", expected: true, restored: true },
    { table: "products", pk: "sku_A", field: "stock", before: "50", after: failed ? "50" : "49", afterRestore: "50", expected: true, restored: true },
    { table: "products", pk: "sku_B", field: "stock", before: "28", after: failed ? "28" : "27", afterRestore: "28", expected: true, restored: true },
    { table: "coupons", pk: "SAVE10", field: "used_count", before: "142", after: failed ? "142" : "143", afterRestore: "142", expected: true, restored: true },
    { table: "audit_log", pk: `log_${report.runName.slice(0, 6)}`, field: "(row)", before: "-", after: "inserted", afterRestore: "kept", expected: false, restored: false }
  ];
}

export function DataDiffScreen({ snapshot, title, locale, selectedRunId, apiBaseUrl }: DataDiffScreenProps) {
  const [apiDiff, setApiDiff] = useState<DataDiffResponse | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResultResponse | null>(null);
  const [rawDrawerOpen, setRawDrawerOpen] = useState(false);
  const [rawData, setRawData] = useState<RawDataDiffResponse | null>(null);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [rawTab, setRawTab] = useState<RawJsonDrawerTab>("before");
  const [restoreState, setRestoreState] = useState<"idle" | "pending" | "success" | "rejected" | "error">("idle");
  const [restoreMessage, setRestoreMessage] = useState("");

  useEffect(() => {
    if (!selectedRunId) return;
    setApiDiff(null);
    setFetchFailed(false);
    setRestoreResult(null);
    setRawDrawerOpen(false);
    setRawData(null);
    setRawError(null);
    setRestoreState("idle");
    setRestoreMessage("");
    fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunId)}/data-diff`)
      .then((r) => (r.ok ? (r.json() as Promise<DataDiffResponse>) : Promise.reject(r.status)))
      .then((data) => {
        if (data.runId && Array.isArray(data.rows)) {
          setApiDiff(data);
        } else {
          setFetchFailed(true);
        }
      })
      .catch(() => setFetchFailed(true));
    fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunId)}/restore-result`)
      .then((r) => (r.ok ? (r.json() as Promise<RestoreResultResponse>) : Promise.reject(r.status)))
      .then((data) => {
        if (data.runId && Array.isArray(data.items)) {
          setRestoreResult(data);
        }
      })
      .catch(() => setRestoreResult(null));
  }, [apiBaseUrl, selectedRunId]);

  function refreshDiffData() {
    if (!selectedRunId) return;
    fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunId)}/data-diff`)
      .then((r) => (r.ok ? (r.json() as Promise<DataDiffResponse>) : Promise.reject(r.status)))
      .then((data) => {
        if (data.runId && Array.isArray(data.rows)) {
          setApiDiff(data);
        }
      })
      .catch(() => {});
  }

  function refreshRestoreResult() {
    if (!selectedRunId) return;
    fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunId)}/restore-result`)
      .then((r) => (r.ok ? (r.json() as Promise<RestoreResultResponse>) : Promise.reject(r.status)))
      .then((data) => {
        if (data.runId && Array.isArray(data.items)) {
          setRestoreResult(data);
        }
      })
      .catch(() => {});
  }

  function handleViewRawJson() {
    if (!selectedRunId) return;
    setRawLoading(true);
    setRawError(null);
    setRawDrawerOpen(true);
    setRawTab("before");
    fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunId)}/data-diff/raw`)
      .then((r) => (r.ok ? (r.json() as Promise<RawDataDiffResponse>) : Promise.reject(r.status)))
      .then((data) => {
        if (data.runId && Array.isArray(data.before)) {
          setRawData(data);
        } else {
          setRawError("Invalid response shape");
        }
      })
      .catch((err) => setRawError(String(err)))
      .finally(() => setRawLoading(false));
  }

  function handleReRestore() {
    if (!selectedRunId) return;
    setRestoreState("pending");
    setRestoreMessage("");
    fetch(`${apiBaseUrl}/api/phase3/runs/${encodeURIComponent(selectedRunId)}/restore/retry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator: "qa-platform", reason: "Manual re-restore from dataDiff page" })
    })
      .then(async (r) => {
        const data = (await r.json()) as RestoreRetryResponse;
        if (data.status === "ACCEPTED") {
          setRestoreState("success");
          setRestoreMessage(data.message || "Restore retry accepted");
          refreshDiffData();
          refreshRestoreResult();
        } else {
          setRestoreState("rejected");
          setRestoreMessage(data.message || "Restore retry rejected");
        }
      })
      .catch((err) => {
        setRestoreState("error");
        setRestoreMessage(String(err));
      });
  }

  const fallbackReport = fetchFailed && selectedRunId ? selectReportViewModel(snapshot, selectedRunId) : null;

  if (!selectedRunId) {
    return (
      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{l(locale, C.dataComparison)}</p>
            <h3>{l(locale, C.noRunSelected)}</h3>
          </div>
        </div>
      </section>
    );
  }

  const rows: DataDiffRow[] = apiDiff?.rows ?? (fallbackReport ? makeFallbackDiffRows(fallbackReport) : []);
  if (rows.length === 0 && !apiDiff && !fallbackReport) {
    return (
      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{l(locale, C.dataComparison)}</p>
            <h3>{title}</h3>
          </div>
        </div>
      </section>
    );
  }

  if (!apiDiff && !fetchFailed) {
    return (
      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{l(locale, C.dataComparison)}</p>
            <h3>{l(locale, C.loadingDiff)}</h3>
          </div>
        </div>
      </section>
    );
  }

  const expectedChanges = apiDiff?.summary?.expectedChanges ?? rows.filter((r) => r.expected).length;
  const unexpectedChanges = apiDiff?.summary?.unexpectedChanges ?? rows.filter((r) => !r.expected).length;
  const restoredCount = apiDiff?.summary?.restoredCount ?? rows.filter((r) => r.restored).length;
  const affectedTables = apiDiff?.summary?.affectedTables ?? new Set(rows.map((r) => r.table)).size;
  const report = fallbackReport ?? selectReportViewModel(snapshot, selectedRunId);
  const runName = apiDiff?.runId ?? selectedRunId;
  const dbName = apiDiff?.database?.name ?? (() => {
    try {
      const raw = snapshot.environmentConfig[0]?.value ?? "";
      return (JSON.parse(raw) as { name?: string }).name ?? raw.split(":")[1] ?? "-";
    } catch {
      return snapshot.environmentConfig[0]?.label?.split(":")[1] ?? "-";
    }
  })();

  const rawTabs: RawJsonDrawerTab[] = ["before", "after", "afterRestore"];

  return (
    <div className="dataDiffScreen">
      <div className="dataDiffBreadcrumb">
        <span>{l(locale, C.reports)}</span>
        <span>/</span>
        <span>{runName}</span>
        <span>/</span>
        <span>{l(locale, C.dataDiff)}</span>
      </div>

      <section className="dataDiffHero">
        <div className="dataDiffHeroMain">
          <h2>{l(locale, C.dataDiffTitle)}</h2>
          <div className="dataDiffPlanMeta">
            <span>
              <i>{l(locale, C.db)}</i>
              <strong>{dbName}</strong>
            </span>
            <span>
              <i>{l(locale, C.project)}</i>
              <strong>{report?.projectName ?? apiDiff?.projectKey ?? runName}</strong>
            </span>
            <span>
              <i>{l(locale, C.caseLbl)}</i>
              <strong>{apiDiff?.caseName ?? report?.caseName ?? runName}</strong>
            </span>
          </div>
        </div>
        <div className="dataDiffHeroActions">
          <button type="button" className="reportsActionButton ghost" onClick={handleViewRawJson} disabled={rawLoading}>
            {rawLoading ? l(locale, C.loading) : l(locale, C.viewRawJson)}
          </button>
          <button type="button" className="reportsActionButton" onClick={handleReRestore} disabled={restoreState === "pending"}>
            {restoreState === "pending" ? l(locale, C.restoring) : l(locale, C.reRestore)}
          </button>
        </div>
      </section>

      {restoreState !== "idle" && restoreState !== "pending" ? (
        <div className={`dataDiffRestoreStatus ${restoreState === "success" ? "success" : "warning"}`} data-testid="restore-status">
          <span>
            {restoreState === "success" ? l(locale, C.restoreAccepted) : null}
            {restoreState === "rejected" ? l(locale, C.restoreRejected) : null}
            {restoreState === "error" ? l(locale, C.restoreFailed) : null}
          </span>
          {restoreMessage ? <span className="dataDiffRestoreMsg">{restoreMessage}</span> : null}
        </div>
      ) : null}

      {restoreResult ? (
        <section className="reportPanelCard">
          <div className="reportPanelHeader">
            <div className="reportPanelTitle">{l(locale, C.restoreResult)}</div>
            <span className={`statusBadge ${restoreResult.status === "SUCCESS" ? "status-success" : restoreResult.status === "PARTIAL" ? "status-info" : "status-failed"}`}>
              {restoreResult.status}
            </span>
          </div>
          {restoreResult.items.length ? (
            <div className="reportRecoveryList">
              {restoreResult.items.map((item) => (
                <div key={item.step} className="reportRecoveryRow">
                  <span className={`statusBadge ${item.status === "SUCCESS" ? "status-success" : item.status === "SKIPPED" ? "status-info" : "status-failed"}`}>{item.status}</span>
                  <div className="reportRecoveryCopy">
                    <strong>{item.step}</strong>
                    <span>{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>{l(locale, C.noRestoreResult)}</p>
          )}
        </section>
      ) : null}

      <div className="dataDiffStats">
        <article className="dataDiffStatCard success">
          <div className="dataDiffStatHead">
            <span>{l(locale, C.expectedChanges)}</span>
            <i>+</i>
          </div>
          <strong>{expectedChanges}</strong>
        </article>
        <article className="dataDiffStatCard warning">
          <div className="dataDiffStatHead">
            <span>{l(locale, C.unexpected)}</span>
            <i>!</i>
          </div>
          <strong>{unexpectedChanges}</strong>
        </article>
        <article className="dataDiffStatCard accent">
          <div className="dataDiffStatHead">
            <span>{l(locale, C.restored)}</span>
            <i>&gt;</i>
          </div>
          <strong>{`${restoredCount}/${rows.length}`}</strong>
        </article>
        <article className="dataDiffStatCard accent2">
          <div className="dataDiffStatHead">
            <span>{l(locale, C.tablesAffected)}</span>
            <i>#</i>
          </div>
          <strong>{affectedTables}</strong>
        </article>
      </div>

      <section className="dataDiffTableCard">
        <div className="dataDiffTableHead">
          <div>table</div>
          <div>pk</div>
          <div>field</div>
          <div>before</div>
          <div>after</div>
          <div>after_restore</div>
          <div>expected</div>
          <div>restored</div>
        </div>
        <div className="dataDiffTableBody">
          {rows.map((row) => (
            <div key={`${row.table}-${row.pk}-${row.field}`} className={`dataDiffRow ${!row.expected || !row.restored ? "isWarning" : ""}`}>
              <div className="dataDiffCell strong">{row.table}</div>
              <div className="dataDiffCell muted">{row.pk}</div>
              <div className="dataDiffCell muted">{row.field}</div>
              <div className="dataDiffCell soft">{row.before}</div>
              <div className="dataDiffCell accent">{row.after}</div>
              <div className={`dataDiffCell ${row.restored ? "success" : "danger"}`}>{row.afterRestore}</div>
              <div className="dataDiffCell">
                <span className={`dataDiffBadge ${row.expected ? "success" : "warning"}`}>
                  <span className="dot" />
                  {row.expected ? l(locale, C.exp) : l(locale, C.unexp)}
                </span>
              </div>
              <div className="dataDiffCell">
                <span className={`dataDiffBadge ${row.restored ? "success" : "danger"} iconOnly`}>{row.restored ? "OK" : "NO"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {rawDrawerOpen ? (
        <div className="dataDiffRawDrawer" data-testid="raw-json-drawer">
          <div className="dataDiffRawDrawerHeader">
            <h3>{l(locale, C.rawDiffJson)}</h3>
            <button type="button" onClick={() => setRawDrawerOpen(false)}>
              {l(locale, C.close)}
            </button>
          </div>

          {rawLoading ? (
            <div className="dataDiffRawDrawerBody">
              <p>{l(locale, C.loadingRawData)}</p>
            </div>
          ) : null}

          {rawError ? (
            <div className="dataDiffRawDrawerBody">
              <p className="danger">{`${l(locale, C.failedToLoadRawDiff)}: ${rawError}`}</p>
            </div>
          ) : null}

          {rawData && !rawLoading && !rawError ? (
            <>
              <div className="dataDiffRawTabs">
                {rawTabs.map((tab) => (
                  <button key={tab} type="button" className={rawTab === tab ? "active" : ""} onClick={() => setRawTab(tab)}>
                    {l(locale, tab === "before" ? C.before : tab === "after" ? C.after : C.afterRestore)}
                  </button>
                ))}
              </div>
              <div className="dataDiffRawDrawerBody">
                <pre className="dataDiffRawPre">{JSON.stringify(rawData[rawTab], null, 2)}</pre>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
