export function ProjectInfoView() {
  return (
    <div className="max-w-5xl space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-3">
        <p className="text-xs font-semibold text-blue-700">Academic &amp; Technical Documentation</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sales Prediction and Forecasting using Machine Learning
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Comprehensive project specification covering architecture, data preprocessing, exploratory data analysis, supervised regression models, time-series forecasting methods, evaluation metrics, and practical business applications.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">01. Introduction</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Modern retail and enterprise organizations generate vast volumes of daily transaction logs. Transforming raw historical sales records into actionable revenue forecasts is critical for inventory planning, staffing, supply-chain optimization, and budget allocation. This platform automates end-to-end data ingestion, cleaning, visualization, Machine Learning training, and multi-horizon forecasting inside an interactive web dashboard.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">02. Problem Statement</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Manual spreadsheet forecasting struggles to capture non-linear pricing effects, regional variations, weekday/monthly seasonality, and sudden demand shifts. Furthermore, raw CSV exports frequently suffer from inconsistent column schemas, duplicate rows, missing values, and non-chronological ordering, which lead to unreliable predictions or data leakage if fed naively into predictive algorithms.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">03. Objectives</h3>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
            <li>Provide flexible CSV upload with schema mapping for arbitrary sales datasets.</li>
            <li>Automate duplicate removal, missing value imputation, and chronological sorting.</li>
            <li>Deliver rich Exploratory Data Analysis (EDA) and dynamic interactive charts.</li>
            <li>Train and compare Linear Regression, Decision Tree, Random Forest, Moving Average, and Historical Trend Forecasting models.</li>
            <li>Enforce leak-free chronological train-test splitting and compute real MAE, MSE, RMSE, R², and MAPE metrics.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">04. Existing System</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Traditional approaches rely on static spreadsheet formulas, subjective managerial intuition, or isolated Python notebooks that require technical expertise to execute. Conventional tools rarely combine data quality auditing, interactive exploratory visualizations, multi-algorithm benchmarking, and real-time what-if inference in a unified browser interface.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">05. Proposed System</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            The proposed full-stack React + TypeScript + Node.js application executes an automated ML pipeline end-to-end. Users upload any CSV sales dataset, map columns, inspect cleaned records, explore interactive Recharts visualizations, train 5 mathematical ML/time-series models on the Node.js backend, compare accuracy metrics objectively, and generate both single-order predictions and multi-day future revenue forecasts.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">06. Dataset Description</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            The system supports transactional sales datasets containing temporal, commercial, and categorical attributes:
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
            <li><span className="font-medium text-slate-800">Date:</span> Transaction timestamp normalized to YYYY-MM-DD.</li>
            <li><span className="font-medium text-slate-800">Product &amp; Category:</span> Item name and high-level merchandise segment.</li>
            <li><span className="font-medium text-slate-800">Quantity &amp; Unit Price:</span> Units purchased and per-unit price.</li>
            <li><span className="font-medium text-slate-800">Sales &amp; Region:</span> Target revenue variable and geographic market.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">07. Data Preprocessing</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Before modeling, the preprocessing engine detects and removes exact duplicate rows, parses multiple date formats strictly, sanitizes currency symbols from numeric columns, and handles missing values via median/mode imputation (or row dropping when configured). All valid records are sorted chronologically, and causal lag/cyclic features are engineered without future data leakage.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">08. Exploratory Data Analysis</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            The EDA module computes Total Revenue, Total Orders, Units Sold, Average Order Value, Highest/Lowest single transactions, and Month-over-Month (MoM) growth rates. Interactive line, bar, area, donut, and multi-year comparison charts dynamically visualize product, category, region, daily, and monthly sales patterns.
          </p>
        </section>
      </div>

      {/* Section 9: ML Algorithms Explained Simply */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            09. Machine Learning Algorithms Explained
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            How each implemented regression and time-series algorithm learns patterns from historical sales
          </p>
        </div>

        <div className="space-y-4 divide-y divide-slate-100">
          <div className="pt-2">
            <h4 className="text-sm font-semibold text-slate-900">
              1. Linear Regression (Multivariate Ridge-Regularized OLS)
            </h4>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              Models sales as a weighted linear combination of standardized input features (quantity, unit price, cyclic sine/cosine seasonality, time trend, lag sales, and encoded product/region signals). It solves the regularized normal equation{' '}
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                (XᵀX + λI)β = Xᵀy
              </span>{' '}
              via Gaussian elimination to find coefficients that minimize squared prediction error while remaining stable when features are correlated.
            </p>
          </div>

          <div className="pt-4">
            <h4 className="text-sm font-semibold text-slate-900">
              2. Decision Tree Regression (CART)
            </h4>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              Recursively partitions the dataset into binary branches by choosing the feature and threshold that produce the largest reduction in Sum of Squared Errors (variance). Unlike linear models, Decision Trees naturally capture non-linear rules (e.g., high-quantity discounts or product-specific price tiers) up to a controlled maximum depth.
            </p>
          </div>

          <div className="pt-4">
            <h4 className="text-sm font-semibold text-slate-900">
              3. Random Forest Regression (Bagged Ensemble)
            </h4>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              Combines predictions from multiple Decision Trees trained on bootstrap samples of the training set, with each tree split considering a random subset of features. Averaging across many diverse trees dramatically reduces variance and overfitting compared to a single tree, typically achieving the highest accuracy on tabular sales data.
            </p>
          </div>

          <div className="pt-4">
            <h4 className="text-sm font-semibold text-slate-900">
              4. Moving Average (Time-Series Baseline)
            </h4>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              Smooths out daily random noise by averaging sales over the trailing <span className="font-mono">k</span> days (e.g., 7-day window). Evaluated strictly walk-forward on the chronological test set and adjusted with day-of-week seasonality when projecting future demand.
            </p>
          </div>

          <div className="pt-4">
            <h4 className="text-sm font-semibold text-slate-900">
              5. Historical Trend-Based Forecasting (Holt&rsquo;s Double Exponential Smoothing + Seasonality)
            </h4>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              Decomposes daily revenue into a smoothed baseline level, a linear growth trend slope, and multiplicative day-of-week seasonal factors. Optimal smoothing parameters (<span className="font-mono">α, β</span>) are selected via grid search on the training period to project multi-day future demand with confidence bounds.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">10. Model Evaluation</h3>
          <ul className="text-sm text-slate-600 space-y-1.5">
            <li><span className="font-semibold text-slate-800">MAE:</span> Average absolute dollar error.</li>
            <li><span className="font-semibold text-slate-800">MSE:</span> Mean of squared errors (penalizes outliers).</li>
            <li><span className="font-semibold text-slate-800">RMSE:</span> Square root of MSE in original currency units.</li>
            <li><span className="font-semibold text-slate-800">R² Score:</span> Variance explained (closer to 1.0 is better).</li>
            <li><span className="font-semibold text-slate-800">MAPE:</span> Average percentage error relative to actuals.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">11. Applications</h3>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
            <li>Retail &amp; e-commerce inventory replenishment planning.</li>
            <li>Quarterly revenue budgeting and financial target setting.</li>
            <li>Regional warehouse allocation and staffing schedules.</li>
            <li>Promotional impact and pricing sensitivity analysis.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">12. Future Enhancements</h3>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
            <li>Gradient Boosted Trees (XGBoost / LightGBM) and SARIMA integration.</li>
            <li>External holiday calendars and macroeconomic indicators.</li>
            <li>Automated anomaly detection and SKU-level stockout alerts.</li>
            <li>Persistent cloud database storage and scheduled batch retraining.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
