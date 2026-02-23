CREATE TYPE "HoldStage" AS ENUM ('NEW', 'MID', 'LATE', 'UNKNOWN');
CREATE TYPE "SignalType" AS ENUM ('LEADERSHIP_CHANGE','UNDERPERFORMANCE_GUIDANCE_RESET','LIQUIDITY_CAPITAL_STRUCTURE_STRESS','STRATEGIC_ALTERNATIVES_ACTIVISM','CARVEOUT_DIVESTITURE','TRANSFORMATION_INFRASTRUCTURE_BUILDOUT','EXEC_FUNCTIONAL_ROLE_SIGNAL','SPONSOR_OPERATING_INTERVENTION','CUSTOMER_CONCENTRATION_PRICING','REGULATORY_LABOR_PRESSURE','OTHER');
CREATE TYPE "TriggerType" AS ENUM ('STRUCTURAL','EARLY_INTERVENTION');
CREATE TYPE "TriggerStatus" AS ENUM ('OPEN','FOLLOWED_UP','RESOLVED','DISMISSED');
CREATE TYPE "ActionType" AS ENUM ('EMAIL','CALL','TEXT','SLACK','MEETING','INTRO_REQUEST','NOTE');

CREATE TABLE "sponsors" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT UNIQUE NOT NULL,
  "strategy_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "operating_model_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "portfolio_companies" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sponsor_id" UUID NOT NULL REFERENCES "sponsors"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "sector" TEXT,
  "geography" TEXT,
  "hold_stage" "HoldStage" NOT NULL DEFAULT 'UNKNOWN',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("sponsor_id", "name")
);

CREATE TABLE "source_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "url" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "publisher" TEXT,
  "published_at" DATE,
  "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "raw_excerpt" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "signals" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "portfolio_company_id" UUID NOT NULL REFERENCES "portfolio_companies"("id") ON DELETE CASCADE,
  "sponsor_id" UUID NOT NULL REFERENCES "sponsors"("id") ON DELETE CASCADE,
  "signal_type" "SignalType" NOT NULL,
  "observed_fact" TEXT NOT NULL,
  "normalized_fact" TEXT NOT NULL,
  "confidence_flags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "first_seen_at" DATE NOT NULL,
  "last_seen_at" DATE NOT NULL,
  "source_item_id" UUID REFERENCES "source_items"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "signals_dedupe_idx" ON "signals"("portfolio_company_id","signal_type","normalized_fact");

CREATE TABLE "trigger_hypotheses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "portfolio_company_id" UUID NOT NULL REFERENCES "portfolio_companies"("id") ON DELETE CASCADE,
  "sponsor_id" UUID NOT NULL REFERENCES "sponsors"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "trigger_type" "TriggerType" NOT NULL,
  "hypothesis_text" TEXT NOT NULL,
  "confidence_score" DECIMAL(2,1) NOT NULL,
  "quiet_window" BOOLEAN NOT NULL DEFAULT false,
  "sponsor_intent_notes" TEXT,
  "status" "TriggerStatus" NOT NULL DEFAULT 'OPEN',
  "owner" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "trigger_signals" (
  "trigger_id" UUID NOT NULL REFERENCES "trigger_hypotheses"("id") ON DELETE CASCADE,
  "signal_id" UUID NOT NULL REFERENCES "signals"("id") ON DELETE CASCADE,
  PRIMARY KEY ("trigger_id", "signal_id")
);

CREATE TABLE "action_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trigger_id" UUID NOT NULL REFERENCES "trigger_hypotheses"("id") ON DELETE CASCADE,
  "action_type" "ActionType" NOT NULL,
  "target_person" TEXT,
  "target_org" TEXT,
  "action_notes" TEXT NOT NULL,
  "action_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "outcome" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_access_sponsors" ON sponsors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_access_companies" ON portfolio_companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_access_sources" ON source_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_access_signals" ON signals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_access_triggers" ON trigger_hypotheses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_access_trigger_signals" ON trigger_signals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_access_action_logs" ON action_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
