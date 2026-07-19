-- =====================================================================
-- CAS Education ERP & CRM Platform  |  MySQL 8 Schema (schema.sql)
-- Engine: InnoDB  |  Charset: utf8mb4  |  Companion to Technical Report
-- Conventions: BIGINT UNSIGNED PKs; soft delete (deleted_at);
--   audit columns created_by/updated_by; money DECIMAL(15,2)+currency.
-- NOTE: created_by/updated_by FKs to users are added where sensible but
--   left un-constrained on high-churn tables to ease seeding; enable in prod.
-- =====================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================ FOUNDATION ==============================
CREATE TABLE countries (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  iso2         CHAR(2) NOT NULL,
  phone_code   VARCHAR(8) NULL,
  created_at   TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_countries_iso2 (iso2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE branches (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  code         VARCHAR(30) NOT NULL,
  country_id   BIGINT UNSIGNED NULL,
  city         VARCHAR(100) NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_branches_code (code),
  KEY idx_branches_country (country_id),
  CONSTRAINT fk_branches_country FOREIGN KEY (country_id) REFERENCES countries(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE departments (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  code         VARCHAR(30) NOT NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_departments_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  phone          VARCHAR(30) NULL,
  password       VARCHAR(255) NOT NULL,
  branch_id      BIGINT UNSIGNED NULL,
  department_id  BIGINT UNSIGNED NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'active',
  two_fa_secret  VARCHAR(255) NULL,
  last_login_at  TIMESTAMP NULL,
  created_at     TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_branch (branch_id), KEY idx_users_dept (department_id),
  CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_users_dept FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RBAC (spatie-compatible)
CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL, guard_name VARCHAR(50) NOT NULL DEFAULT 'web',
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_roles_name_guard (name, guard_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL, guard_name VARCHAR(50) NOT NULL DEFAULT 'web',
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_permissions_name_guard (name, guard_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE role_permissions (
  permission_id BIGINT UNSIGNED NOT NULL,
  role_id       BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (permission_id, role_id),
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE model_has_roles (
  role_id    BIGINT UNSIGNED NOT NULL,
  model_type VARCHAR(150) NOT NULL,
  model_id   BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, model_id, model_type),
  KEY idx_mhr_model (model_id, model_type),
  CONSTRAINT fk_mhr_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ADDENDUM (ADR-0003): direct model-level permission grants, required by
-- spatie/laravel-permission's resolution path. Shape mirrors model_has_roles.
CREATE TABLE model_has_permissions (
  permission_id BIGINT UNSIGNED NOT NULL,
  model_type    VARCHAR(150) NOT NULL,
  model_id      BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (permission_id, model_id, model_type),
  KEY idx_mhp_model (model_id, model_type),
  CONSTRAINT fk_mhp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(150) NOT NULL, `value` JSON NULL, `group` VARCHAR(80) NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_settings_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE api_sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'website',   -- website|agent|campaign|manual
  website_url VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE api_keys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  api_source_id BIGINT UNSIGNED NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  scopes JSON NULL,
  rate_limit INT UNSIGNED NOT NULL DEFAULT 60,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_api_keys_hash (key_hash),
  KEY idx_api_keys_source (api_source_id),
  CONSTRAINT fk_apikeys_source FOREIGN KEY (api_source_id) REFERENCES api_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================== CRM ==================================
CREATE TABLE marketing_sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL, channel VARCHAR(60) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE campaigns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  marketing_source_id BIGINT UNSIGNED NULL,
  utm_source VARCHAR(120) NULL, utm_medium VARCHAR(120) NULL, utm_campaign VARCHAR(120) NULL,
  start_date DATE NULL, end_date DATE NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  KEY idx_campaigns_ms (marketing_source_id),
  CONSTRAINT fk_campaigns_ms FOREIGN KEY (marketing_source_id) REFERENCES marketing_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE website_sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  api_source_id BIGINT UNSIGNED NULL,
  domain VARCHAR(190) NOT NULL,
  university_focus VARCHAR(190) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_website_domain (domain),
  KEY idx_website_source (api_source_id),
  CONSTRAINT fk_website_source FOREIGN KEY (api_source_id) REFERENCES api_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  agent_code VARCHAR(40) NOT NULL,
  name VARCHAR(180) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'partner',   -- partner|sub|sub_sub
  parent_agent_id BIGINT UNSIGNED NULL,
  email VARCHAR(190) NULL, phone VARCHAR(30) NULL,
  country_id BIGINT UNSIGNED NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_agents_code (agent_code),
  KEY idx_agents_parent (parent_agent_id),
  CONSTRAINT fk_agents_parent FOREIGN KEY (parent_agent_id) REFERENCES agents(id),
  CONSTRAINT fk_agents_country FOREIGN KEY (country_id) REFERENCES countries(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(40) NOT NULL,
  first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NULL, phone VARCHAR(30) NULL,
  passport_no VARCHAR(50) NULL, dob DATE NULL, gender VARCHAR(15) NULL,
  country_id BIGINT UNSIGNED NULL, branch_id BIGINT UNSIGNED NULL,
  agent_id BIGINT UNSIGNED NULL, assigned_counselor_id BIGINT UNSIGNED NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL, updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_students_code (student_code),
  KEY idx_students_passport (passport_no),
  KEY idx_students_email (email), KEY idx_students_phone (phone),
  KEY idx_students_counselor (assigned_counselor_id),
  KEY idx_students_agent (agent_id), KEY idx_students_status (status),
  CONSTRAINT fk_students_country FOREIGN KEY (country_id) REFERENCES countries(id),
  CONSTRAINT fk_students_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_students_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_students_counselor FOREIGN KEY (assigned_counselor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE leads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NULL, last_name VARCHAR(100) NULL,
  email VARCHAR(190) NULL, phone VARCHAR(30) NULL, passport_no VARCHAR(50) NULL,
  country_id BIGINT UNSIGNED NULL,
  website_source_id BIGINT UNSIGNED NULL, marketing_source_id BIGINT UNSIGNED NULL,
  campaign_id BIGINT UNSIGNED NULL, agent_id BIGINT UNSIGNED NULL,
  assigned_user_id BIGINT UNSIGNED NULL,
  intake_route VARCHAR(10) NOT NULL DEFAULT 'info',  -- info|full
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  student_id BIGINT UNSIGNED NULL, duplicate_of BIGINT UNSIGNED NULL,
  message TEXT NULL, meta JSON NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  KEY idx_leads_status_assignee_date (status, assigned_user_id, created_at),
  KEY idx_leads_email (email), KEY idx_leads_phone (phone), KEY idx_leads_passport (passport_no),
  KEY idx_leads_website (website_source_id), KEY idx_leads_campaign (campaign_id),
  CONSTRAINT fk_leads_country FOREIGN KEY (country_id) REFERENCES countries(id),
  CONSTRAINT fk_leads_website FOREIGN KEY (website_source_id) REFERENCES website_sources(id),
  CONSTRAINT fk_leads_ms FOREIGN KEY (marketing_source_id) REFERENCES marketing_sources(id),
  CONSTRAINT fk_leads_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  CONSTRAINT fk_leads_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_leads_assignee FOREIGN KEY (assigned_user_id) REFERENCES users(id),
  CONSTRAINT fk_leads_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_leads_dupof FOREIGN KEY (duplicate_of) REFERENCES leads(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE student_guardians (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL, relation VARCHAR(50) NULL,
  phone VARCHAR(30) NULL, email VARCHAR(190) NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_guardians_student (student_id),
  CONSTRAINT fk_guardians_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE activities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NULL,
  type VARCHAR(30) NOT NULL,           -- note|call|email|status|system
  body TEXT NULL, meta JSON NULL,
  created_at TIMESTAMP NULL,
  KEY idx_activities_student (student_id, created_at),
  CONSTRAINT fk_activities_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================ CATALOG ================================
CREATE TABLE universities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL, code VARCHAR(40) NOT NULL,
  country_id BIGINT UNSIGNED NULL, city VARCHAR(100) NULL, website VARCHAR(190) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_universities_code (code),
  CONSTRAINT fk_universities_country FOREIGN KEY (country_id) REFERENCES countries(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE university_contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  university_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL, email VARCHAR(190) NULL, phone VARCHAR(30) NULL, role VARCHAR(80) NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_unicontacts_uni (university_id),
  CONSTRAINT fk_unicontacts_uni FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Programs (renamed from `courses` per ADR-0006). The program id is the PK.
CREATE TABLE programs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  university_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(190) NOT NULL, level VARCHAR(20) NOT NULL DEFAULT 'bachelor',
  teaching_language VARCHAR(60) NULL,
  duration_months SMALLINT UNSIGNED NULL,
  tuition_fee DECIMAL(15,2) NULL, currency CHAR(3) NULL,
  apply_link VARCHAR(255) NULL,
  requirements JSON NULL, status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  KEY idx_programs_uni (university_id),
  CONSTRAINT fk_programs_uni FOREIGN KEY (university_id) REFERENCES universities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE intakes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  university_id BIGINT UNSIGNED NOT NULL, program_id BIGINT UNSIGNED NULL,
  name VARCHAR(80) NOT NULL, start_date DATE NULL, application_deadline DATE NULL,
  seats INT UNSIGNED NULL, status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_intakes_uni (university_id), KEY idx_intakes_program (program_id),
  CONSTRAINT fk_intakes_uni FOREIGN KEY (university_id) REFERENCES universities(id),
  CONSTRAINT fk_intakes_program FOREIGN KEY (program_id) REFERENCES programs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE scholarships (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  university_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(190) NOT NULL, type VARCHAR(60) NULL, coverage VARCHAR(120) NULL,
  criteria JSON NULL, deadline DATE NULL, status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  KEY idx_scholarships_uni (university_id),
  CONSTRAINT fk_scholarships_uni FOREIGN KEY (university_id) REFERENCES universities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE university_agreements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  university_id BIGINT UNSIGNED NOT NULL, program_id BIGINT UNSIGNED NULL,
  commission_type VARCHAR(20) NOT NULL DEFAULT 'percent', -- fixed|percent|tiered
  commission_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NULL,
  eligibility_trigger VARCHAR(60) NOT NULL DEFAULT 'arrival_first_year_paid',
  valid_from DATE NULL, valid_to DATE NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_agreements_uni (university_id), KEY idx_agreements_program (program_id),
  CONSTRAINT fk_agreements_uni FOREIGN KEY (university_id) REFERENCES universities(id),
  CONSTRAINT fk_agreements_program FOREIGN KEY (program_id) REFERENCES programs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_agreements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  agent_id BIGINT UNSIGNED NOT NULL,
  share_type VARCHAR(20) NOT NULL DEFAULT 'percent',  -- percent|fixed
  share_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  applies_to JSON NULL, valid_from DATE NULL, valid_to DATE NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_agentagreements_agent (agent_id),
  CONSTRAINT fk_agentagreements_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================= ADMISSIONS/DOCS ==========================
CREATE TABLE applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  application_code VARCHAR(40) NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  university_id BIGINT UNSIGNED NOT NULL, program_id BIGINT UNSIGNED NOT NULL,
  intake_id BIGINT UNSIGNED NULL, scholarship_id BIGINT UNSIGNED NULL,
  agent_id BIGINT UNSIGNED NULL, assigned_admissions_id BIGINT UNSIGNED NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP NULL,
  created_by BIGINT UNSIGNED NULL, updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_applications_code (application_code),
  KEY idx_apps_student (student_id),
  KEY idx_apps_status_admissions (status, assigned_admissions_id),
  KEY idx_apps_uni (university_id), KEY idx_apps_program (program_id),
  CONSTRAINT fk_apps_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_apps_uni FOREIGN KEY (university_id) REFERENCES universities(id),
  CONSTRAINT fk_apps_program FOREIGN KEY (program_id) REFERENCES programs(id),
  CONSTRAINT fk_apps_intake FOREIGN KEY (intake_id) REFERENCES intakes(id),
  CONSTRAINT fk_apps_scholarship FOREIGN KEY (scholarship_id) REFERENCES scholarships(id),
  CONSTRAINT fk_apps_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_apps_admissions FOREIGN KEY (assigned_admissions_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE application_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(30) NULL, to_status VARCHAR(30) NOT NULL,
  changed_by BIGINT UNSIGNED NULL, note VARCHAR(500) NULL,
  created_at TIMESTAMP NULL,
  KEY idx_ash_app (application_id, created_at),
  CONSTRAINT fk_ash_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_ash_user FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE document_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL, category VARCHAR(60) NULL,
  is_sensitive TINYINT(1) NOT NULL DEFAULT 0, required_for JSON NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_doctypes_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  document_type_id BIGINT UNSIGNED NULL,
  documentable_type VARCHAR(150) NOT NULL, documentable_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NOT NULL, file_name VARCHAR(255) NOT NULL,
  mime VARCHAR(120) NULL, size BIGINT UNSIGNED NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  verified_by BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  KEY idx_documents_poly (documentable_type, documentable_id),
  KEY idx_documents_type (document_type_id),
  CONSTRAINT fk_documents_type FOREIGN KEY (document_type_id) REFERENCES document_types(id),
  CONSTRAINT fk_documents_verifier FOREIGN KEY (verified_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE document_access_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  document_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NULL,
  action VARCHAR(20) NOT NULL, ip VARCHAR(45) NULL, created_at TIMESTAMP NULL,
  KEY idx_dal_doc (document_id, created_at),
  CONSTRAINT fk_dal_doc FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE offers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  offer_type VARCHAR(20) NOT NULL DEFAULT 'conditional',
  reference_no VARCHAR(80) NULL, issued_date DATE NULL, expiry_date DATE NULL,
  document_id BIGINT UNSIGNED NULL, status VARCHAR(20) NOT NULL DEFAULT 'issued',
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_offers_app (application_id),
  CONSTRAINT fk_offers_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_offers_doc FOREIGN KEY (document_id) REFERENCES documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================= FINANCE & COMMISSION =======================
CREATE TABLE invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(50) NOT NULL,
  party_type VARCHAR(20) NOT NULL,      -- student|agent|university
  party_id BIGINT UNSIGNED NOT NULL,
  application_id BIGINT UNSIGNED NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0, tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0, amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMP NULL, due_at TIMESTAMP NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_invoices_no (invoice_no),
  KEY idx_invoices_party (party_type, party_id),
  KEY idx_invoices_status (status), KEY idx_invoices_app (application_id),
  CONSTRAINT fk_invoices_app FOREIGN KEY (application_id) REFERENCES applications(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE invoice_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL, qty DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0, amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  KEY idx_invitems_inv (invoice_id),
  CONSTRAINT fk_invitems_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  payment_no VARCHAR(50) NOT NULL, invoice_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'USD',
  method VARCHAR(40) NULL, reference VARCHAR(120) NULL,
  document_id BIGINT UNSIGNED NULL, received_at TIMESTAMP NULL,
  recorded_by BIGINT UNSIGNED NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_payments_no (payment_no),
  KEY idx_payments_inv (invoice_id),
  CONSTRAINT fk_payments_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_payments_doc FOREIGN KEY (document_id) REFERENCES documents(id),
  CONSTRAINT fk_payments_user FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE commissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  university_id BIGINT UNSIGNED NOT NULL, agreement_id BIGINT UNSIGNED NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  expected_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  eligible_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  invoiced_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  received_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'expected',
  eligibility_confirmed_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_commissions_app (application_id),
  KEY idx_commissions_status_uni (status, university_id),
  CONSTRAINT fk_commissions_app FOREIGN KEY (application_id) REFERENCES applications(id),
  CONSTRAINT fk_commissions_uni FOREIGN KEY (university_id) REFERENCES universities(id),
  CONSTRAINT fk_commissions_agreement FOREIGN KEY (agreement_id) REFERENCES university_agreements(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE commission_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  commission_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NULL, to_status VARCHAR(20) NOT NULL,
  amount DECIMAL(15,2) NULL, reference VARCHAR(120) NULL,
  changed_by BIGINT UNSIGNED NULL, created_at TIMESTAMP NULL,
  KEY idx_csh_commission (commission_id, created_at),
  CONSTRAINT fk_csh_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_payables (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  commission_id BIGINT UNSIGNED NOT NULL, agent_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0, currency CHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'payable',   -- payable|paid
  computed_at TIMESTAMP NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_payables_commission (commission_id), KEY idx_payables_agent (agent_id),
  CONSTRAINT fk_payables_commission FOREIGN KEY (commission_id) REFERENCES commissions(id),
  CONSTRAINT fk_payables_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  agent_payable_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL, method VARCHAR(40) NULL, reference VARCHAR(120) NULL,
  document_id BIGINT UNSIGNED NULL, paid_at TIMESTAMP NULL,
  recorded_by BIGINT UNSIGNED NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_agentpay_payable (agent_payable_id),
  CONSTRAINT fk_agentpay_payable FOREIGN KEY (agent_payable_id) REFERENCES agent_payables(id),
  CONSTRAINT fk_agentpay_doc FOREIGN KEY (document_id) REFERENCES documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================== VISA ================================
CREATE TABLE visa_cases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL, student_id BIGINT UNSIGNED NOT NULL,
  assigned_visa_officer_id BIGINT UNSIGNED NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'not_started',
  appointment_at TIMESTAMP NULL, submitted_at TIMESTAMP NULL,
  decision_at TIMESTAMP NULL, travel_ready_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  KEY idx_visa_app (application_id), KEY idx_visa_student (student_id),
  KEY idx_visa_status (status),
  CONSTRAINT fk_visa_app FOREIGN KEY (application_id) REFERENCES applications(id),
  CONSTRAINT fk_visa_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_visa_officer FOREIGN KEY (assigned_visa_officer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE visa_checklist_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  visa_case_id BIGINT UNSIGNED NOT NULL, name VARCHAR(150) NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1, document_id BIGINT UNSIGNED NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_visaitems_case (visa_case_id),
  CONSTRAINT fk_visaitems_case FOREIGN KEY (visa_case_id) REFERENCES visa_cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_visaitems_doc FOREIGN KEY (document_id) REFERENCES documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE visa_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  visa_case_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(30) NULL, to_status VARCHAR(30) NOT NULL,
  changed_by BIGINT UNSIGNED NULL, note VARCHAR(500) NULL, created_at TIMESTAMP NULL,
  KEY idx_vsh_case (visa_case_id, created_at),
  CONSTRAINT fk_vsh_case FOREIGN KEY (visa_case_id) REFERENCES visa_cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================== WORKFLOW / COMMS / SYSTEM =======================
CREATE TABLE tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(190) NOT NULL, description TEXT NULL,
  assignee_id BIGINT UNSIGNED NULL, student_id BIGINT UNSIGNED NULL,
  related_type VARCHAR(150) NULL, related_id BIGINT UNSIGNED NULL,
  due_at TIMESTAMP NULL, priority VARCHAR(10) NOT NULL DEFAULT 'normal',
  status VARCHAR(20) NOT NULL DEFAULT 'open', escalated_at TIMESTAMP NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  KEY idx_tasks_assignee_status_due (assignee_id, status, due_at),
  KEY idx_tasks_student (student_id),
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(id),
  CONSTRAINT fk_tasks_student FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE workflow_definitions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL, entity_type VARCHAR(60) NOT NULL,
  states JSON NULL, transitions JSON NULL, sla JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE workflow_transitions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(60) NOT NULL, entity_id BIGINT UNSIGNED NOT NULL,
  from_state VARCHAR(40) NULL, to_state VARCHAR(40) NOT NULL,
  actor_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NULL,
  KEY idx_wt_entity (entity_type, entity_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE automation_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL, trigger_def JSON NULL, conditions JSON NULL, actions JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL, type VARCHAR(80) NOT NULL,
  title VARCHAR(190) NULL, body TEXT NULL,
  entity_type VARCHAR(40) NULL, entity_id BIGINT UNSIGNED NULL,   -- record the bell links to
  channels JSON NULL,
  read_at TIMESTAMP NULL, created_at TIMESTAMP NULL,
  KEY idx_notifications_user (user_id, read_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE communications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NULL, channel VARCHAR(20) NOT NULL,  -- email|whatsapp|sms
  direction VARCHAR(10) NOT NULL DEFAULT 'out', template VARCHAR(120) NULL,
  body TEXT NULL, status VARCHAR(20) NOT NULL DEFAULT 'queued',
  sent_by BIGINT UNSIGNED NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_comm_student (student_id, created_at),
  CONSTRAINT fk_comm_student FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE message_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  communication_id BIGINT UNSIGNED NOT NULL, provider VARCHAR(60) NULL,
  provider_msg_id VARCHAR(150) NULL, status VARCHAR(30) NULL, error TEXT NULL,
  created_at TIMESTAMP NULL,
  KEY idx_msglogs_comm (communication_id),
  CONSTRAINT fk_msglogs_comm FOREIGN KEY (communication_id) REFERENCES communications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL, action VARCHAR(40) NOT NULL,
  auditable_type VARCHAR(150) NOT NULL, auditable_id BIGINT UNSIGNED NOT NULL,
  old_values JSON NULL, new_values JSON NULL,
  ip VARCHAR(45) NULL, user_agent VARCHAR(255) NULL, created_at TIMESTAMP NULL,
  KEY idx_audit_entity (auditable_type, auditable_id, created_at),
  KEY idx_audit_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ADDENDUM (ADR-0004): portal credentials for the agent and student Sanctum
-- guards (report §5.7 / §5.11 / §7.1). NULL password = portal not activated.
ALTER TABLE agents
  ADD COLUMN password      VARCHAR(255) NULL AFTER phone,
  ADD COLUMN last_login_at TIMESTAMP NULL AFTER status;
ALTER TABLE students
  ADD COLUMN password      VARCHAR(255) NULL AFTER phone,
  ADD COLUMN last_login_at TIMESTAMP NULL AFTER status;

-- ADDENDUM (ADR-0005): university website content fields. Catalog is the
-- public-website content base; these enrich each university record.
ALTER TABLE universities
  ADD COLUMN slug                     VARCHAR(190) NULL AFTER code,
  ADD COLUMN logo_path                VARCHAR(500) NULL AFTER website,
  ADD COLUMN cover_path               VARCHAR(500) NULL AFTER logo_path,
  ADD COLUMN address                  VARCHAR(255) NULL AFTER city,
  ADD COLUMN moe_listed               TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN nearest_airport          VARCHAR(150) NULL,
  ADD COLUMN about                    TEXT NULL,
  ADD COLUMN apply_link               VARCHAR(255) NULL,
  ADD COLUMN requirements             JSON NULL,
  ADD COLUMN representative_professor JSON NULL,
  ADD UNIQUE KEY uq_universities_slug (slug);

-- ADDENDUM (ADR-0007): scholarship website content fields.
ALTER TABLE scholarships
  ADD COLUMN slug         VARCHAR(190) NULL AFTER name,
  ADD COLUMN description  TEXT NULL,
  ADD COLUMN amount       DECIMAL(15,2) NULL AFTER coverage,
  ADD COLUMN currency     CHAR(3) NULL AFTER amount,
  ADD COLUMN eligibility  TEXT NULL,
  ADD COLUMN how_to_apply TEXT NULL,
  ADD COLUMN apply_link   VARCHAR(255) NULL,
  ADD UNIQUE KEY uq_scholarships_slug (slug);

-- ADDENDUM (ADR-0008): applicant intake fields for the portal application-
-- submission wizard — extended personal details on the student, a guardian
-- occupation, and a prior-education history table. All additive and nullable.
ALTER TABLE students
  ADD COLUMN marital_status       VARCHAR(20)  NULL AFTER gender,
  ADD COLUMN religion             VARCHAR(60)  NULL AFTER marital_status,
  ADD COLUMN place_of_birth       VARCHAR(120) NULL AFTER dob,
  ADD COLUMN passport_issue_date  DATE         NULL AFTER passport_no,
  ADD COLUMN passport_expiry_date DATE         NULL AFTER passport_issue_date,
  ADD COLUMN permanent_address    VARCHAR(255) NULL,
  ADD COLUMN current_address      VARCHAR(255) NULL,
  ADD COLUMN city                 VARCHAR(120) NULL,
  ADD COLUMN postal_code          VARCHAR(20)  NULL;

ALTER TABLE student_guardians
  ADD COLUMN occupation VARCHAR(120) NULL AFTER relation;

CREATE TABLE student_education (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  level VARCHAR(40) NULL,                 -- high_school | intermediate | bachelor | master | ...
  degree_name VARCHAR(150) NULL,
  institution VARCHAR(190) NULL,
  board_or_university VARCHAR(190) NULL,
  country_id BIGINT UNSIGNED NULL,
  major VARCHAR(150) NULL,
  start_year SMALLINT UNSIGNED NULL,
  end_year SMALLINT UNSIGNED NULL,
  grade_type VARCHAR(20) NULL,            -- gpa | cgpa | percentage | grade
  grade_value VARCHAR(30) NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  KEY idx_studenteducation_student (student_id),
  CONSTRAINT fk_studenteducation_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_studenteducation_country FOREIGN KEY (country_id) REFERENCES countries(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ADDENDUM (ADR-0009): richer application form — English proficiency on the
-- student and an address on contacts (an emergency contact is a guardian row
-- with relation 'Emergency contact'). Additive and nullable.
ALTER TABLE students
  ADD COLUMN english_test       VARCHAR(30) NULL AFTER religion,
  ADD COLUMN english_test_score VARCHAR(30) NULL AFTER english_test,
  ADD COLUMN english_test_date  DATE        NULL AFTER english_test_score;

ALTER TABLE student_guardians
  ADD COLUMN address VARCHAR(255) NULL AFTER email;

-- ADDENDUM (ADR-0010): per-course CAS service charges — a JSON matrix keyed by
-- funding (self|scholarship|partial) × applicant (student|agent) + currency.
-- Display-only (course is the source of truth; Finance invoices later).
ALTER TABLE programs
  ADD COLUMN service_charges JSON NULL AFTER requirements;

-- Hostel/accommodation fee per course, alongside tuition (same currency).
ALTER TABLE programs
  ADD COLUMN hostel_fee DECIMAL(15,2) NULL AFTER tuition_fee;

-- Concrete scholarship benefits: tuition/hostel a student pays after the
-- award, plus an optional monthly stipend (same currency as the scholarship).
ALTER TABLE scholarships
  ADD COLUMN tuition_after    DECIMAL(15,2) NULL AFTER amount,
  ADD COLUMN hostel_after     DECIMAL(15,2) NULL AFTER tuition_after,
  ADD COLUMN stipend_monthly  DECIMAL(15,2) NULL AFTER hostel_after;

-- Which of a university's scholarships support a program (admin-selected on
-- the course form). Drives the apply flow and the service-charge matrix.
CREATE TABLE program_scholarships (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  program_id BIGINT UNSIGNED NOT NULL,
  scholarship_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_program_scholarship (program_id, scholarship_id),
  CONSTRAINT fk_progsch_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_progsch_scholarship FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Scholarship scope: internal to a university (default) or a government/
-- national award with no single university (university_id becomes nullable).
ALTER TABLE scholarships
  ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'university' AFTER university_id,
  MODIFY COLUMN university_id BIGINT UNSIGNED NULL;

-- Government scholarships: per-degree-level benefits JSON (bachelor|master|phd
-- × tuition_after/hostel_after/stipend_monthly) and the universities they cover.
ALTER TABLE scholarships
  ADD COLUMN benefits JSON NULL AFTER deadline;

CREATE TABLE scholarship_universities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scholarship_id BIGINT UNSIGNED NOT NULL,
  university_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_scholarship_university (scholarship_id, university_id),
  CONSTRAINT fk_schuni_scholarship FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE,
  CONSTRAINT fk_schuni_university FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Second application kind: a general government-scholarship application with
-- no exact program/university — a degree level + scholarship + up to three
-- major/university preferences (subject to approval). Plus a majors picklist.
ALTER TABLE applications
  ADD COLUMN kind        VARCHAR(20) NOT NULL DEFAULT 'program' AFTER application_code,
  ADD COLUMN level       VARCHAR(20) NULL AFTER kind,
  ADD COLUMN preferences JSON        NULL AFTER scholarship_id,
  MODIFY COLUMN university_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN program_id    BIGINT UNSIGNED NULL;

CREATE TABLE majors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_majors_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- =========================== END OF SCHEMA ===========================
