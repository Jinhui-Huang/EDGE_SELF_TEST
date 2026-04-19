import { CSSProperties } from "react";
import { translate } from "../i18n";
import { AdminConsoleSnapshot, Locale } from "../types";
import { selectReportViewModel } from "./reportViewModel";

type ReportDetailScreenProps = {
  snapshot: AdminConsoleSnapshot;
  title: string;
  locale: Locale;
  selectedRunName: string | null;
  onBackToReports: () => void;
  onOpenDataDiff: () => void;
};

function copy(en: string, zh: string, ja: string) {
  return { en, zh, ja };
}

function statusClass(status: string) {
  if (/fail/i.test(status)) {
    return "status-failed";
  }
  if (/success|ok|pass/i.test(status)) {
    return "status-success";
  }
  return "status-info";
}

export function ReportDetailScreen({
  snapshot,
  title,
  locale,
  selectedRunName,
  onBackToReports,
  onOpenDataDiff
}: ReportDetailScreenProps) {
  const t = (value: { en: string; zh: string; ja: string }) => translate(locale, value);
  const report = selectReportViewModel(snapshot, selectedRunName);

  if (!report) {
    return (
      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">{title}</p>
            <h3>{t(copy("No report available", "暂无报告", "レポートがありません"))}</h3>
          </div>
        </div>
      </section>
    );
  }

  const tabs = [
    t(copy("Overview", "概览", "概要")),
    t(copy("Steps", "步骤", "ステップ")),
    t(copy("Assertions", "断言", "アサーション")),
    t(copy("Data diff", "数据差异", "データ差分")),
    t(copy("Recovery", "恢复", "復旧")),
    t(copy("AI decisions", "AI 决策", "AI 判断"))
  ];

  return (
    <div className="reportDetailScreen">
      <div className="reportDetailBreadcrumb">
        <button type="button" className="reportDetailBacklink" onClick={onBackToReports}>
          {t(copy("Reports", "报告", "レポート"))}
        </button>
        <span>/</span>
        <span>{report.runName}</span>
      </div>

      <section className="reportHero">
        <div className="reportHeroMain">
          <div className="reportHeroTitleRow">
            <h2>{report.caseName}</h2>
            <span className={`statusBadge ${statusClass(report.status)}`}>{report.status}</span>
          </div>
          <p className="reportHeroSubtitle">
            {`${report.finishedAt} | ${report.duration} | ${report.environment} | ${report.model} | ${report.operator}`}
          </p>
        </div>
        <div className="reportHeroActions">
          <button type="button" className="reportsActionButton ghost">
            {t(copy("Download artifacts", "下载产物", "成果物を取得"))}
          </button>
          <button type="button" className="reportsActionButton">
            {t(copy("Re-run", "重新执行", "再実行"))}
          </button>
        </div>
      </section>

      <div className="reportTabs">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            className={`reportTab ${index === 0 ? "isActive" : ""}`}
            onClick={index === 3 ? onOpenDataDiff : undefined}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="reportOverviewGrid">
        <section className="reportPanelCard">
          <div className="reportPanelTitle">{t(copy("Summary", "摘要", "サマリー"))}</div>
          <div className="reportSummaryHead">
            <div
              className="reportProgressRing"
              style={{ "--progress": `${Math.round((report.stepsPassed / Math.max(1, report.stepsTotal)) * 360)}deg` } as CSSProperties}
            >
              <div>{`${report.stepsPassed}/${report.stepsTotal}`}</div>
            </div>
            <div className="reportSummaryRate">
              <span>{t(copy("Steps passed", "步骤通过", "通過ステップ"))}</span>
              <strong>{`${Math.round((report.stepsPassed / Math.max(1, report.stepsTotal)) * 100)}%`}</strong>
            </div>
          </div>

          <div className="reportStatGrid">
            <div className="reportStatCard">
              <span>{t(copy("Duration", "时长", "所要時間"))}</span>
              <strong>{report.duration}</strong>
            </div>
            <div className="reportStatCard success">
              <span>{t(copy("Assertions", "断言", "アサーション"))}</span>
              <strong>{`${report.assertionsPassed}/${report.assertionsTotal}`}</strong>
            </div>
            <div className="reportStatCard accent">
              <span>{t(copy("AI calls", "AI 调用", "AI 呼び出し"))}</span>
              <strong>{report.aiCalls}</strong>
            </div>
            <div className="reportStatCard accent4">
              <span>{t(copy("AI cost", "AI 成本", "AI コスト"))}</span>
              <strong>{report.aiCost}</strong>
            </div>
            <div className="reportStatCard warning">
              <span>{t(copy("Heals", "自愈", "自己修復"))}</span>
              <strong>{report.heals}</strong>
            </div>
            <div className="reportStatCard success">
              <span>{t(copy("Recovery", "恢复", "復旧"))}</span>
              <strong>{report.recovery}</strong>
            </div>
          </div>
        </section>

        <section className="reportPanelCard reportPanelMedia">
          <div className="reportPanelHeader">
            <div className="reportPanelTitle">{t(copy("Page screenshots", "页面截图", "ページスクリーンショット"))}</div>
          </div>
          <div className="reportScreenshotGrid">
            {report.screenshots.map((item) => (
              <div key={`${report.runName}-${item.label}`} className={`reportShotCard ${item.tone}`}>
                <div className="reportShotIndex">{item.label}</div>
                <div className="reportShotBody">
                  <span />
                  <span />
                  <span />
                  <div />
                </div>
                <div className="reportShotPath">{item.path}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="reportPanelCard reportPanelAssertions">
          <div className="reportPanelHeader">
            <div className="reportPanelTitle">{t(copy("Assertions", "断言", "アサーション"))}</div>
          </div>
          <div className="reportAssertionList">
            {report.assertions.map((item) => (
              <div key={`${report.runName}-${item.name}`} className="reportAssertionRow">
                <div className={`reportAssertionDot ${item.pass ? "pass" : "fail"}`}>{item.pass ? "OK" : "!"}</div>
                <div className="reportAssertionCopy">
                  <div>{item.name}</div>
                  <span>{`-> ${item.actual}`}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
