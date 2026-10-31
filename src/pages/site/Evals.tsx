import { EVAL_ROWS, FACTORY_EVAL, FACTORY_EVAL_ROWS } from './siteData'

const evalMax = 100

/** CodeIndex against text search: measured, see EVAL_ROWS. */
export function CodeIndexEval() {
  return (
    <div className="lp-eval">
      <div className="lp-eval-head">
        <h4>Against text search, on 18 repositories</h4>
        <p>
          82 questions on 18 real repositories, put to the same agent with CodeIndex
          and with ripgrep text search, three times each. Correct answers were
          computed from the source code.
        </p>
      </div>
      <div className="lp-eval-kpis">
        <div className="lp-eval-kpi">
          <strong>90.5%</strong>
          <span>answered correctly with CodeIndex</span>
          <em>69.5% with text search</em>
        </div>
        <div className="lp-eval-kpi">
          <strong>176k</strong>
          <span>tokens per answer</span>
          <em>436k with text search</em>
        </div>
      </div>
      <div className="lp-eval-bars">
        {EVAL_ROWS.map((r) => (
          <div key={r.q} className="lp-eval-row">
            <span className="lp-eval-q">{r.q}</span>
            <div className="lp-eval-pair">
              <span className="lp-eval-line">
                <span className="lp-eval-bar lp-eval-bar--ours">
                  <span style={{ width: `${(r.index / evalMax) * 100}%` }} />
                </span>
                <em>{r.index.toFixed(1)}%</em>
              </span>
              <span className="lp-eval-line">
                <span className="lp-eval-bar">
                  <span style={{ width: `${(r.grep / evalMax) * 100}%` }} />
                </span>
                <em>{r.grep.toFixed(1)}%</em>
              </span>
            </div>
          </div>
        ))}
        <div className="lp-legend lp-legend--left">
          <span><i className="lp-legend-swatch lp-legend-swatch--ours" /> CodeIndex</span>
          <span><i className="lp-legend-swatch lp-legend-swatch--grep" /> Text search (ripgrep)</span>
        </div>
      </div>
    </div>
  )
}

/** igni 1.0 4B before and after the factory: measured, see FACTORY_EVAL. */
export function FactoryEval() {
  return (
    <div className="lp-eval lp-eval--factory">
      <div className="lp-eval-head">
        <h4>Our own model, built with the factory</h4>
        <p>
          igni 1.0 4B started as the open-weight Qwen3.5-4B. The factory tuned it on
          igni&rsquo;s agent work, then tested it on {FACTORY_EVAL.total} scenarios it
          had never seen.
        </p>
      </div>
      <div className="lp-eval-kpis">
        <div className="lp-eval-kpi">
          <strong>{((FACTORY_EVAL.tuned / FACTORY_EVAL.total) * 100).toFixed(1)}%</strong>
          <span>of scenarios passed after tuning</span>
          <em>{((FACTORY_EVAL.base / FACTORY_EVAL.total) * 100).toFixed(1)}% before</em>
        </div>
        <div className="lp-eval-kpi">
          <strong>
            {FACTORY_EVAL.up} of {FACTORY_EVAL.families}
          </strong>
          <span>kinds of task improved</span>
          <em>
            {FACTORY_EVAL.same} held, {FACTORY_EVAL.down} dropped
          </em>
        </div>
      </div>
      <div className="lp-eval-bars">
        {FACTORY_EVAL_ROWS.map((r) => (
          <div key={r.q} className="lp-eval-row">
            <span className="lp-eval-q">{r.q}</span>
            <div className="lp-eval-pair">
              <span className="lp-eval-line">
                <span className="lp-eval-bar lp-eval-bar--ours">
                  <span style={{ width: `${(r.tuned / r.n) * 100}%` }} />
                </span>
                <em>
                  {r.tuned}/{r.n}
                </em>
              </span>
              <span className="lp-eval-line">
                <span className="lp-eval-bar">
                  <span style={{ width: `${(r.base / r.n) * 100}%` }} />
                </span>
                <em>
                  {r.base}/{r.n}
                </em>
              </span>
            </div>
          </div>
        ))}
        <div className="lp-legend lp-legend--left">
          <span><i className="lp-legend-swatch lp-legend-swatch--factory" /> igni 1.0 4B</span>
          <span><i className="lp-legend-swatch lp-legend-swatch--grep" /> Qwen3.5-4B, before tuning</span>
        </div>
      </div>
      <p className="lp-eval-source">
        Ignite Ember&rsquo;s test. Each scenario is scored by fixed rules, and where it
        has a rubric also by a MiniMax-M2.7 judge, three votes. The two that dropped:
        task tracking and following repository conventions.
      </p>
    </div>
  )
}
