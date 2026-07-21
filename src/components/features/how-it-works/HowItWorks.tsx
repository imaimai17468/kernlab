import { Link } from "@tanstack/react-router";
import { ACCENT_LINK_CLASS } from "@/components/shared/external-link/accentLinkClass";
import { ExternalLink } from "@/components/shared/external-link/ExternalLink";
import { GITHUB_URL } from "@/lib/site";
import { AreaDiagram } from "./AreaDiagram";
import { DiagramFrame } from "./DiagramFrame";
import { FrameDiagram } from "./FrameDiagram";
import { MeasureDiagram } from "./MeasureDiagram";
import { SolveDiagram } from "./SolveDiagram";

const SRC_BASE = `${GITHUB_URL}/blob/main/src/components/features/kern-lab`;

type SourceLinkProps = {
  file: string;
  note: string;
};

function SourceLink({ file, note }: SourceLinkProps) {
  return (
    <p className="font-kl-mono text-xs text-kl-muted">
      実装: <ExternalLink href={`${SRC_BASE}/${file}`}>{file}</ExternalLink>{" "}
      {note}
    </p>
  );
}

export function HowItWorks() {
  return (
    <div className="min-h-dvh bg-kl-paper font-kl-sans text-kl-ink">
      <div className="mx-auto max-w-3xl px-5 pt-5 pb-12 max-sm:px-3.5 max-sm:pt-4 max-sm:pb-10">
        <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2 border-b border-kl-ink pb-2.5">
          <div className="flex items-baseline gap-3">
            <Link
              to="/"
              className="text-2xl font-extrabold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kl-blue"
            >
              KERN LAB
            </Link>
            <span className="text-xs text-kl-muted">仕組み</span>
          </div>
          <ExternalLink href={GITHUB_URL} className="text-xs">
            GitHub
          </ExternalLink>
        </header>

        <h1 className="text-lg font-bold">KERN LAB の仕組み</h1>

        <p className="mt-3 max-w-prose text-sm">
          KERN LAB
          は、文字どうしの間隔を字面（インク）の見た目から自動で決めるロゴ組版ツールです。フォントのメトリクスではなく描画されたピクセルそのものを計測するため、A
          と V のような斜めの字形も自然につまります。
        </p>

        <div className="mt-10 flex flex-col gap-12">
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold">1文字ずつ字面を走査する</h2>
            <p className="max-w-prose text-sm">
              各文字を計測用キャンバスに大きく描画し、走査行ごとに最初と最後のインクピクセルを検出します。得られる左右のエッジプロファイル（Lp
              /
              Rr）がその文字の「字面のかたち」で、フォント・ウェイトごとにキャッシュされます。
            </p>
            <DiagramFrame caption="走査行ごとのインク端。字面ボックスの左右端からの距離が Lp / Rr">
              <MeasureDiagram />
            </DiagramFrame>
            <SourceLink file="engine/kerning.ts" note="の measureGlyph" />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold">
              隣どうしの余白を行ごとに測る
            </h2>
            <p className="max-w-prose text-sm">
              隣り合う2文字のあいだでは、行ごとに「左の文字の右端から右の文字の左端まで」の白量を測ります。離れすぎた行が平均を支配しないよう白量には上限（cap）を設けます。ツールの「余白の面積」表示は、この帯をそのまま重ねて描いたものです。
            </p>
            <DiagramFrame caption="行ごとの白量（赤）。cap を超えるぶんは数えない">
              <AreaDiagram />
            </DiagramFrame>
            <SourceLink
              file="engine/render.ts"
              note="の renderToContext（可視化）"
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold">面積が目標に合う間隔を解く</h2>
            <p className="max-w-prose text-sm">
              間隔 s
              を広げると行ごとの白量の平均は単調に増えます。平均が目標値（字間スライダーで決まる）と一致する
              s
              を46回の二分探索で求め、最後に最小の隙間が床値を割らないよう補正します。これをすべての隣接ペアに適用します。
            </p>
            <DiagramFrame caption="単調な平均白量と target の交点を lo / hi で挟み込む">
              <SolveDiagram />
            </DiagramFrame>
            <SourceLink
              file="engine/kerning.ts"
              note="の solveS / computeLayout"
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold">額縁に納めて書き出す</h2>
            <p className="max-w-prose text-sm">
              全文字の字面を包むボックスの高さから、比率（余白スライダー）で上下左右のパディングを生成し、字面の中心を額縁の中央に置きます。PNG
              は字面から算出した約2400px幅の高解像度ラスター、SVG
              はフォントを参照するベクターとして書き出します。
            </p>
            <DiagramFrame caption="pad は字面の高さ × 比率。中心合わせで光学中央に座る">
              <FrameDiagram />
            </DiagramFrame>
            <SourceLink
              file="engine/export.ts"
              note="の exportPNG / exportSVG"
            />
          </section>
        </div>

        <footer className="mt-12 flex flex-wrap items-baseline gap-x-5 gap-y-8 border-t border-kl-ink pt-3.5 text-xs">
          <Link to="/" className={ACCENT_LINK_CLASS}>
            ← ツールに戻る
          </Link>
          <ExternalLink href={GITHUB_URL}>GitHub</ExternalLink>
        </footer>
      </div>
    </div>
  );
}
