import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";
import { ReportViewModel, selectReportViewModel } from "./reportViewModel";

type DataDiffScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
  selectedRunName: string | null;
};

type DiffRow = {
  table: string;
  pk: string;
  field: string;
  before: string;
  after: string;
  afterRestore: string;
  expected: boolean;
  restored: boolean;
};

function l(locale: Locale, en: string, zh: string, ja: string) {
  return translate(locale, { en, zh, ja });
}

function makeDiffRows(report: ReportViewModel): DiffRow[] {
  const failed = /fail/i.test(report.status);
  const infoOnly = /info/i.test(report.status);

  const rows: DiffRow[] = [
    {
      table: "orders",
      pk: "ord_8821",
      field: "status",
      before: "null",
      after: failed ? '"pending"' : '"paid"',
      afterRestore: infoOnly ? (failed ? '"pending"' : '"paid"') : "null",
      expected: true,
      restored: !infoOnly
    },
    {
      table: "orders",
      pk: "ord_8821",
      field: "total_cents",
      before: "null",
      after: "8910",
      afterRestore: infoOnly ? "8910" : "null",
      expected: true,
      restored: !infoOnly
    },
    {
      table: "order_items",
      pk: "oi_9104",
      field: "(row)",
      before: "-",
      after: "inserted",
      afterRestore: "-",
      expected: true,
      restored: true
    },
    {
      table: "order_items",
      pk: "oi_9105",
      field: "(row)",
      before: "-",
      after: "inserted",
      afterRestore: "-",
      expected: true,
      restored: true
    },
    {
      table: "products",
      pk: "sku_A",
      field: "stock",
      before: "50",
      after: failed ? "50" : "49",
      afterRestore: "50",
      expected: true,
      restored: true
    },
    {
      table: "products",
      pk: "sku_B",
      field: "stock",
      before: "28",
      after: failed ? "28" : "27",
      afterRestore: "28",
      expected: true,
      restored: true
    },
    {
      table: "coupons",
      pk: "SAVE10",
      field: "used_count",
      before: "142",
      after: failed ? "142" : "143",
      afterRestore: "142",
      expected: true,
      restored: true
    },
    {
      table: "audit_log",
      pk: `log_${report.runName.slice(0, 6)}`,
      field: "(row)",
      before: "-",
      after: "inserted",
      afterRestore: "kept",
      expected: false,
      restored: false
    }
  ];

  return rows;
}

export function DataDiffScreen({ snapshot, title, locale, selectedRunName }: DataDiffScreenProps) {
  const report = selectReportViewModel(snapshot, selectedRunName);

  if (!report) {
    return (
      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{l(locale, "Data comparison", "数据对比", "データ比較")}</p>
            <h3>{title}</h3>
          </div>
        </div>
      </section>
    );
  }

  const rows = makeDiffRows(report);
  const expectedChanges = rows.filter((row) => row.expected).length;
  const unexpectedChanges = rows.length - expectedChanges;
  const restoredCount = rows.filter((row) => row.restored).length;
  const affectedTables = new Set(rows.map((row) => row.table)).size;

  const dbName = (() => {
    try {
      const raw = snapshot.environmentConfig[0]?.value ?? "";
      return (JSON.parse(raw) as { name?: string }).name ?? raw.split(":")[1] ?? "-";
    } catch {
      return snapshot.environmentConfig[0]?.label?.split(":")[1] ?? "-";
    }
  })();

  return (
    <div className="dataDiffScreen">
      <div className="dataDiffBreadcrumb">
        <span>{l(locale, "Reports", "报告", "レポート")}</span>
        <span>/</span>
        <span>{report.runName}</span>
        <span>/</span>
        <span>{l(locale, "Data diff", "数据差异", "データ差分")}</span>
      </div>

      <section className="dataDiffHero">
        <div className="dataDiffHeroMain">
          <h2>{l(locale, "Data diff - orders & inventory", "数据差异 - 订单与库存", "データ差分 - 注文と在庫")}</h2>
          <div className="dataDiffPlanMeta">
            <span>
              <i>{l(locale, "DB", "数据库", "DB")}</i>
              <strong>{dbName}</strong>
            </span>
            <span>
              <i>{l(locale, "Project", "项目", "プロジェクト")}</i>
              <strong>{report.projectName}</strong>
            </span>
            <span>
              <i>{l(locale, "Case", "用例", "ケース")}</i>
              <strong>{report.caseName}</strong>
            </span>
          </div>
        </div>
        <div className="dataDiffHeroActions">
          <button type="button" className="reportsActionButton ghost">
            {l(locale, "View raw JSON", "查看原始 JSON", "生 JSON を表示")}
          </button>
          <button type="button" className="reportsActionButton">
            {l(locale, "Re-restore", "重新恢复", "再リストア")}
          </button>
        </div>
      </section>

      <div className="dataDiffStats">
        <article className="dataDiffStatCard success">
          <div className="dataDiffStatHead">
            <span>{l(locale, "Expected changes", "预期变更", "想定変更")}</span>
            <i>+</i>
          </div>
          <strong>{expectedChanges}</strong>
        </article>
        <article className="dataDiffStatCard warning">
          <div className="dataDiffStatHead">
            <span>{l(locale, "Unexpected", "非预期", "想定外")}</span>
            <i>!</i>
          </div>
          <strong>{unexpectedChanges}</strong>
        </article>
        <article className="dataDiffStatCard accent">
          <div className="dataDiffStatHead">
            <span>{l(locale, "Restored", "已恢复", "復元済み")}</span>
            <i>&gt;</i>
          </div>
          <strong>{`${restoredCount}/${rows.length}`}</strong>
        </article>
        <article className="dataDiffStatCard accent2">
          <div className="dataDiffStatHead">
            <span>{l(locale, "Tables affected", "涉及表", "影響テーブル")}</span>
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
            <div
              key={`${row.table}-${row.pk}-${row.field}`}
              className={`dataDiffRow ${!row.expected || !row.restored ? "isWarning" : ""}`}
            >
              <div className="dataDiffCell strong">{row.table}</div>
              <div className="dataDiffCell muted">{row.pk}</div>
              <div className="dataDiffCell muted">{row.field}</div>
              <div className="dataDiffCell soft">{row.before}</div>
              <div className="dataDiffCell accent">{row.after}</div>
              <div className={`dataDiffCell ${row.restored ? "success" : "danger"}`}>{row.afterRestore}</div>
              <div className="dataDiffCell">
                <span className={`dataDiffBadge ${row.expected ? "success" : "warning"}`}>
                  <span className="dot" />
                  {row.expected ? l(locale, "exp", "预期", "想定") : l(locale, "unexp", "非预期", "想定外")}
                </span>
              </div>
              <div className="dataDiffCell">
                <span className={`dataDiffBadge ${row.restored ? "success" : "danger"} iconOnly`}>
                  {row.restored ? "OK" : "NO"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
