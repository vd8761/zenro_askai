/**
 * Zenro HRMS & Payroll Complete Database Schema Knowledge Base
 * 100% verified against live MySQL database: shc_2026 (Shadithya Hospital)
 * Contains all 61 non-_old tables, every field with exact data type, nullability, key, and indexes.
 */

export const ZENRO_SCHEMA_DESCRIPTION = `DATABASE ENGINE: MySQL (shc_2026 / zenro_touchmark)
TOTAL TABLES (non-_old): 61
ALL CORE TABLES USE "gs_" PREFIX
CONVENTIONS & VERIFIED BUSINESS LOGIC (Extracted from MySQL SHOW FULL COLUMNS Comments):
  - Soft deletes: Column \`deleted\` (0 = Active, 1 = Soft Deleted). ALWAYS check \`(table.deleted = 0 OR table.deleted IS NULL)\`
  - Status: Column \`status\` (1 = Active / Approved, 0 = Inactive / Draft)

  1. DAILY ATTENDANCE RULES (gs_daily_actual_attendance):
     * attendance_status: 1 = Full Day | 2 = Half Day | 3 = Absent | 4 = Week Off | 5 = Holiday | 6 = On Duty
     * CRITICAL RULE FOR PRESENT EMPLOYEES:
       When employees punch in during the workday, checkin_time is recorded immediately (e.g. '09:25:00').
       Before the end-of-day cron job runs, attendance_status may be 0, 1, 2, or 6.
       THEREFORE: An employee is PRESENT if ((a.checkin_time IS NOT NULL AND a.checkin_time != '00:00:00') OR a.attendance_status IN (1, 2, 6)).
       An employee is ABSENT if (a.attendance_status = 3 OR ((a.checkin_time IS NULL OR a.checkin_time = '00:00:00') AND a.attendance_status NOT IN (1, 2, 4, 5, 6))).
     * DATE HANDLING: For "today" queries:
       Use COALESCE to check CURDATE(), but if no punches exist for CURDATE() yet, fall back to MAX(attendance_checkin_date).
     * lop_status: 0 = Loss of Pay | 1 = Approved leaves
     * emp_day_status: 0 = Working Day | 1 = Holiday | 2 = Week off | 3 = Leave | 4 = Half Day | 5 = On Duty | 6 = N/A (Unpaid Days)
     * entry_type: 1 = Mobile App | 2 = Bulk upload | 3 = Form Submission | 4 = Cron | 5 = Holiday Updation

  2. EMPLOYEE STATUS (gs_employee):
     * emp_status: 1 = New Joined | 2 = Regular/Provisional | 3 = Regular/Confirmed | 4 = Suspension | 5 = Long Absent | 6 = Resigned | 7 = Terminated
     * Active employees: (e.deleted = 0 OR e.deleted IS NULL) AND e.emp_status IN (1, 2, 3)

  3. LEAVES (gs_employee_leave_debits):
     * leave_type: 1 = Casual Leave (CL) | 2 = Sick Leave (SL) | 3 = Earned Leave (EL) | 4 = Compensatory Leave (CML) | 5 = Maternity Leave | 7 = Menstrual Leave
     * leave_status: 1 = New | 2 = Pending | 3 = Approved | 4 = Reject | 5 = Auto Reject | 6 = Canceled by Employee
     * leave_day: 1 = Full Day | 2 = First half day | 3 = Second half day

  4. HOURLY PERMISSIONS (gs_employee_hourly_leave_permission_debits):
     * permission_status: 1 = New/Pending | 2 = Approved | 3 = Reject | 4 = Cancelled by Employee
     * permission_type: 1 = Fixed count | 2 = Fixed hours

  5. LOANS & ADVANCES (gs_employee_loan & gs_employee_advance_payment):
     * loan status: 1 = Open | 2 = Closed (total_loan_due > 0 is active balance)
     * advance payment status: 0 = Not Deducted in Payslip | 1 = Deducted in Payslip

  6. PAYSLIP CALCULATIONS (gs_payslip_actual):
     * total_paid_days = (WEEK OFF DAYS + HOLIDAYS + PRESENT DAYS + LEAVE APPROVED DAYS)
     * total_working_days = NO OF DAYS IN A MONTH - (WEEK OFF DAYS + HOLIDAYS)
     * payroll_component_type: 1 = Earnings | 2 = Deductions | 3 = Reimbursement | 4 = Benefits

=============================================================================
1. api_log_request_type_list (PK: gs_api_log_request_type_ID, Columns: 7)
=============================================================================
INDEXES: PRIMARY(gs_api_log_request_type_ID)[UNIQUE]
COLUMNS:
  gs_api_log_request_type_ID          int(11)              Null:NO  Key:PRI Default:NULL
  request_type_text                   text                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(1)           Null:NO  Key:    Default:'0'
  deleted                             tinyint(1)           Null:NO  Key:    Default:'0'

=============================================================================
2. gs_ai_chat_messages (PK: message_id, Columns: 7)
=============================================================================
INDEXES: PRIMARY(message_id)[UNIQUE]; idx_session(session_id)
COLUMNS:
  message_id                          int(11)              Null:NO  Key:PRI Default:NULL
  session_id                          int(11)              Null:NO  Key:MUL Default:NULL
  sender                              enum('user','assistant','system') Null:NO  Key:    Default:NULL
  content                             text                 Null:NO  Key:    Default:NULL
  generated_sql                       text                 Null:YES Key:    Default:'NULL'
  sql_result_json                     longtext             Null:YES Key:    Default:'NULL'
  createdon                           datetime             Null:NO  Key:    Default:'current_timestamp()'

=============================================================================
3. gs_ai_chat_session (PK: session_id, Columns: 6)
=============================================================================
INDEXES: PRIMARY(session_id)[UNIQUE]; idx_user(user_id)
COLUMNS:
  session_id                          int(11)              Null:NO  Key:PRI Default:NULL
  user_id                             int(11)              Null:NO  Key:MUL Default:NULL
  session_title                       varchar(255)         Null:NO  Key:    Default:''New Conversation''
  createdon                           datetime             Null:NO  Key:    Default:'current_timestamp()'
  updatedon                           timestamp            Null:NO  Key:    Default:'current_timestamp()'
  status                              tinyint(1)           Null:NO  Key:    Default:'1'

=============================================================================
4. gs_api_log (PK: gs_api_log_ID, Columns: 15)
=============================================================================
INDEXES: PRIMARY(gs_api_log_ID)[UNIQUE]; idx_gs_mobile_api_log_employee(employee_ID); idx_gs_mobile_api_log_status_deleted(status,deleted); idx_gs_mobile_api_log_created_updated(createdon,updatedon); idx_gs_mobile_api_log_createdby(createdby)
COLUMNS:
  gs_api_log_ID                       int(11)              Null:NO  Key:PRI Default:NULL
  request_type                        int(11)              Null:NO  Key:    Default:'0'
  employee_ID                         int(11)              Null:NO  Key:MUL Default:'0'
  emp_device_id                       text                 Null:YES Key:    Default:'NULL'
  emp_device_name                     text                 Null:YES Key:    Default:'NULL'
  emp_token                           text                 Null:YES Key:    Default:'NULL'
  status_true_or_false                text                 Null:YES Key:    Default:'NULL'
  status_code                         text                 Null:YES Key:    Default:'NULL'
  api_request_body                    text                 Null:YES Key:    Default:'NULL'
  api_request_response                text                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(1)           Null:NO  Key:MUL Default:'0'
  deleted                             tinyint(1)           Null:NO  Key:    Default:'0'

=============================================================================
5. gs_bank (PK: bank_id, Columns: 7)
=============================================================================
INDEXES: PRIMARY(bank_id)[UNIQUE]; idx_gs_bank_status_deleted(status,deleted); idx_gs_bank_created_updated(createdon,updatedon); idx_gs_bank_createdby(createdby); idx_gs_bank_name(bank_name)
COLUMNS:
  bank_id                             int(11)              Null:NO  Key:PRI Default:NULL
  bank_name                           varchar(200)         Null:YES Key:MUL Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
6. gs_bank_details (PK: bank_detail_id, Columns: 13)
=============================================================================
INDEXES: PRIMARY(bank_detail_id)[UNIQUE]; idx_gs_bank_details_bank_id(bank_id); idx_gs_bank_details_ifsc_micr(bank_ifsc_code,bank_micr_no); idx_gs_bank_details_location(bank_city,bank_district,bank_state); idx_gs_bank_details_status_deleted(status,deleted); idx_gs_bank_details_created_updated(createdon,updatedon); idx_gs_bank_details_createdby(createdby)
COLUMNS:
  bank_detail_id                      int(11)              Null:NO  Key:PRI Default:NULL
  bank_id                             int(11)              Null:NO  Key:MUL Default:'0'
  bank_branch                         varchar(50)          Null:YES Key:    Default:'NULL'
  bank_ifsc_code                      varchar(11)          Null:NO  Key:MUL Default:''0''
  bank_micr_no                        int(11)              Null:YES Key:    Default:'0'
  bank_city                           varchar(48)          Null:YES Key:MUL Default:'NULL'
  bank_district                       varchar(48)          Null:YES Key:    Default:'NULL'
  bank_state                          varchar(26)          Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
7. gs_basic_settings (PK: basic_setting_ID, Columns: 105)
=============================================================================
INDEXES: PRIMARY(basic_setting_ID)[UNIQUE]; idx_gs_basic_settings_status_deleted(status,deleted); idx_gs_basic_settings_created_updated(createdon,updatedon); idx_gs_basic_settings_createdby(createdby)
COLUMNS:
  basic_setting_ID                    int(11)              Null:NO  Key:PRI Default:NULL
  normal_working_hrs_per_day          decimal(4,2)         Null:YES Key:    Default:'NULL'
  break_time_in_minutes               int(11)              Null:NO  Key:    Default:'0'
  clock_in_restrict_time              int(11)              Null:NO  Key:    Default:'0'
  working_hrs_policy_status           tinyint(1)           Null:NO  Key:    Default:'0'
  clock_in_out_policy_status          tinyint(1)           Null:NO  Key:    Default:'0'
  clock_in_before_shift_starts_in_mins int(11)              Null:NO  Key:    Default:'0'
  clock_in_before_shift_starts_status tinyint(1)           Null:NO  Key:    Default:'0'
  clock_in_after_shift_starts_in_mins int(11)              Null:NO  Key:    Default:'0'
  clock_in_after_shift_starts_status  tinyint(1)           Null:NO  Key:    Default:'0'
  clock_out_before_shift_ends_in_mins int(11)              Null:NO  Key:    Default:'0'
  clock_out_before_shift_ends_status  tinyint(1)           Null:NO  Key:    Default:'0'
  clock_out_after_shift_ends_in_mins  int(11)              Null:NO  Key:    Default:'0'
  clock_out_after_shift_ends_status   tinyint(1)           Null:NO  Key:    Default:'0'
  clock_in_out_distance_from_default_location float                Null:NO  Key:    Default:'0'
  clock_in_out_distance_from_other_location float                Null:NO  Key:    Default:'0'
  missed_clock_out_policy_status      tinyint(1)           Null:NO  Key:    Default:'0'
  missed_clock_out_employee_attendance_status tinyint(1)           Null:NO  Key:    Default:'0'
  overtime_rate_percentage_status     tinyint(1)           Null:NO  Key:    Default:'0'
  allow_overtime_rate_in_percentage   float                Null:NO  Key:    Default:'0'
  holiday_overtime_rate_in_percentage float                Null:NO  Key:    Default:'0'
  default_no_of_working_days          int(11)              Null:NO  Key:    Default:'0'
  late_configuration_status           tinyint(1)           Null:NO  Key:    Default:'0'
  allow_earned_leave                  decimal(4,2)         Null:NO  Key:    Default:'0.00'
  required_present_days_for_el_credit float                Null:NO  Key:    Default:'0'
  el_leave_carry_forward_applicable   tinyint(1)           Null:NO  Key:    Default:'0'
  earned_privilaged_leave_status      tinyint(1)           Null:NO  Key:    Default:'0'
  casual_leave_allocation_period      int(11)              Null:NO  Key:    Default:'0'
  allow_casual_leave                  decimal(4,2)         Null:NO  Key:    Default:'0.00'
  cl_leave_carry_forward_applicable   tinyint(1)           Null:NO  Key:    Default:'0'
  casual_leave_status                 tinyint(1)           Null:NO  Key:    Default:'0'
  sick_leave_allocation_period        int(11)              Null:NO  Key:    Default:'0'
  allow_sick_leave                    decimal(4,2)         Null:NO  Key:    Default:'0.00'
  sl_leave_carry_forward_applicable   tinyint(1)           Null:NO  Key:    Default:'0'
  sick_leave_status                   tinyint(1)           Null:NO  Key:    Default:'0'
  allow_festival_leave                varchar(50)          Null:YES Key:    Default:'NULL'
  fl_leave_carry_forward_applicable   int(11)              Null:NO  Key:    Default:'0'
  festival_leave_allocation_period    int(11)              Null:YES Key:    Default:'NULL'
  festival_leave_status               int(11)              Null:NO  Key:    Default:'1'
  menstrual_leave_allocation_period   int(11)              Null:NO  Key:    Default:'0'
  allow_menstrual_leave               decimal(4,2)         Null:NO  Key:    Default:'0.00'
  msl_leave_carry_forward_applicable  int(11)              Null:NO  Key:    Default:'0'
  menstrual_leave_status              tinyint(4)           Null:NO  Key:    Default:'0'
  allow_maternity_leave               decimal(5,2)         Null:NO  Key:    Default:'0.00'
  maternity_leave_status              tinyint(1)           Null:NO  Key:    Default:'0'
  allow_national_n_festival_holidays_per_year decimal(4,2)         Null:NO  Key:    Default:'0.00'
  national_n_festival_holidays_status tinyint(1)           Null:NO  Key:    Default:'0'
  allow_compensatory_leave            decimal(4,2)         Null:NO  Key:    Default:'0.00'
  compensatory_leave_status           tinyint(1)           Null:NO  Key:    Default:'0'
  payslip_paydate_status              tinyint(1)           Null:YES Key:    Default:'0'
  paydate_day_status                  tinyint(1)           Null:NO  Key:    Default:'0'
  payslip_pay_date                    int(11)              Null:YES Key:    Default:'0'
  allow_compensatory_off              int(11)              Null:NO  Key:    Default:'0'
  payslip_primary_language            varchar(10)          Null:YES Key:    Default:'NULL'
  payslip_secondary_language          varchar(10)          Null:YES Key:    Default:'NULL'
  payslip_language_setup_status       tinyint(1)           Null:NO  Key:    Default:'0'
  esi_config_percentage               float                Null:NO  Key:    Default:'0'
  esi_limit                           decimal(10,2)        Null:NO  Key:    Default:'21000.00'
  pf_wage_limit                       decimal(10,2)        Null:NO  Key:    Default:'25000.00'
  pf_n_esi_config_status              tinyint(1)           Null:NO  Key:    Default:'0'
  pf_deduction_type_below_fifteen_thousand tinyint(1)           Null:NO  Key:    Default:'0'
  pf_deduction_percentage_below_fifteen_thousand float                Null:NO  Key:    Default:'0'
  pf_deduction_type_above_fifteen_thousand tinyint(1)           Null:NO  Key:    Default:'0'
  pf_deduction_percentage_above_fifteen_thousand float                Null:NO  Key:    Default:'0'
  advance_payment_salary_percentage   float                Null:NO  Key:    Default:'0'
  advance_payment_deduction_day       int(11)              Null:NO  Key:    Default:'0'
  advance_payment_config_status       tinyint(1)           Null:NO  Key:    Default:'0'
  working_days_calculation_mode_status tinyint(1)           Null:NO  Key:    Default:'0'
  special_allowance_config_status     tinyint(1)           Null:NO  Key:    Default:'0'
  special_allowance_amount_credited   float                Null:NO  Key:    Default:'0'
  professional_tax_config_status      tinyint(1)           Null:NO  Key:    Default:'0'
  professional_tax_state              tinyint(4)           Null:NO  Key:    Default:'0'
  professional_tax_annual_amount      float                Null:NO  Key:    Default:'0'
  professional_tax_monthly_amount     float                Null:NO  Key:    Default:'0'
  hourly_leave_permission_status      tinyint(1)           Null:NO  Key:    Default:'0'
  hourly_leave_permission_type        tinyint(1)           Null:NO  Key:    Default:'0'
  allowed_permission_count            tinyint(4)           Null:NO  Key:    Default:'0'
  allowed_duration_per_count          int(11)              Null:YES Key:    Default:'0'
  employee_late_and_permission_status tinyint(1)           Null:NO  Key:    Default:'0'
  employee_late_and_permission_time_unit tinyint(1)           Null:NO  Key:    Default:'0'
  employee_late_and_permission_allowed_time_limit tinyint(1)           Null:NO  Key:    Default:'0'
  employee_late_and_permission_lop_type tinyint(1)           Null:NO  Key:    Default:'0'
  employee_late_and_permission_allow_leave_deduction tinyint(1)           Null:NO  Key:    Default:'0'
  el_credit_type                      tinyint(1)           Null:NO  Key:    Default:'0'
  el_service_length                   int(11)              Null:NO  Key:    Default:'0'
  el_minimum_service_period           int(11)              Null:NO  Key:    Default:'0'
  el_carry_forward_capped_days        int(11)              Null:NO  Key:    Default:'0'
  el_annual_encashment                tinyint(1)           Null:NO  Key:    Default:'0'
  employee_late_arrival_grace_time_in_minutes int(11)              Null:NO  Key:    Default:'0'
  total_allowed_duration_per_month    int(11)              Null:YES Key:    Default:'0'
  week_off_configuration_status       tinyint(1)           Null:NO  Key:    Default:'0'
  week_off_configuration_weekdays     text                 Null:YES Key:    Default:'NULL'
  payslip_calculation_type            int(11)              Null:NO  Key:    Default:'0'
  tds_config_status                   tinyint(4)           Null:NO  Key:    Default:'0'
  tds_employment_type                 tinyint(4)           Null:NO  Key:    Default:'0'
  tds_config_percentage               float                Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'
  allow_wife_menstrual_support_leave  int(11)              Null:NO  Key:    Default:'1'
  wife_menstrual_support_leave_allocation_period tinyint(1)           Null:NO  Key:    Default:'1'
  wmsl_leave_carry_forward_applicable tinyint(1)           Null:NO  Key:    Default:'0'
  wife_menstrual_support_leave_status tinyint(1)           Null:NO  Key:    Default:'0'

=============================================================================
8. gs_branch_location (PK: branch_location_id, Columns: 12)
=============================================================================
INDEXES: PRIMARY(branch_location_id)[UNIQUE]; idx_gs_branch_location_name(branch_location_name); idx_gs_branch_location_address(branch_location_address); idx_gs_branch_location_lat_long(branch_location_latitude,branch_location_longitude); idx_gs_branch_location_status_deleted(status,deleted); idx_gs_branch_location_created_updated(createdon,updatedon); idx_gs_branch_location_createdby(createdby)
COLUMNS:
  branch_location_id                  int(11)              Null:NO  Key:PRI Default:NULL
  default_location                    int(11)              Null:NO  Key:    Default:'0'
  branch_location_name                varchar(200)         Null:YES Key:MUL Default:'NULL'
  branch_location_address             varchar(500)         Null:YES Key:MUL Default:'NULL'
  branch_location_latitude            varchar(20)          Null:YES Key:MUL Default:'NULL'
  branch_location_longitude           varchar(20)          Null:YES Key:    Default:'NULL'
  branch_location_logo                varchar(500)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
9. gs_contact_admin_mail_log (PK: pa_contact_admin_mail_log_ID, Columns: 10)
=============================================================================
INDEXES: PRIMARY(pa_contact_admin_mail_log_ID)[UNIQUE]; idx_pa_contact_admin_mail_log_employee_ID(employee_ID); idx_pa_contact_admin_mail_log_status(status); idx_pa_contact_admin_mail_log_deleted(deleted); idx_gs_contact_admin_mail_log_employee(employee_ID); idx_gs_contact_admin_mail_log_status_deleted(status,deleted); idx_gs_contact_admin_mail_log_created_updated(createdon,updatedon); idx_gs_contact_admin_mail_log_createdby(createdby)
COLUMNS:
  pa_contact_admin_mail_log_ID        int(11)              Null:NO  Key:PRI Default:NULL
  employee_ID                         int(11)              Null:NO  Key:MUL Default:'0'
  contact_option                      int(11)              Null:NO  Key:    Default:NULL
  subject                             varchar(100)         Null:YES Key:    Default:'NULL'
  description                         varchar(500)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(1)           Null:NO  Key:MUL Default:'0'
  deleted                             tinyint(1)           Null:NO  Key:MUL Default:'0'

=============================================================================
10. gs_country (PK: country_id, Columns: 13)
=============================================================================
INDEXES: PRIMARY(country_id)[UNIQUE]; idx_gs_country_iso(iso); idx_gs_country_name(name); idx_gs_country_nicename(nicename); idx_gs_country_iso3(iso3); idx_gs_country_numcode(numcode); idx_gs_country_phonecode(phonecode); idx_gs_country_status_deleted(status,deleted); idx_gs_country_created_updated(createdon,updatedon); idx_gs_country_createdby(createdby)
COLUMNS:
  country_id                          int(11)              Null:NO  Key:PRI Default:NULL
  iso                                 char(2)              Null:YES Key:MUL Default:'NULL'
  name                                varchar(80)          Null:YES Key:MUL Default:'NULL'
  nicename                            varchar(80)          Null:YES Key:MUL Default:'NULL'
  iso3                                char(3)              Null:YES Key:MUL Default:'NULL'
  numcode                             smallint(6)          Null:YES Key:MUL Default:'NULL'
  phonecode                           int(11)              Null:NO  Key:MUL Default:NULL
  phone_length                        tinyint(3)           Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:MUL Default:'0'
  deleted                             tinyint(4)           Null:NO  Key:    Default:'0'

=============================================================================
11. gs_daily_actual_attendance (PK: daily_actual_attendance_id, Columns: 43)
=============================================================================
INDEXES: PRIMARY(daily_actual_attendance_id)[UNIQUE]; idx_employee_id(employee_id); idx_attendance_checkin_date(attendance_checkin_date); idx_attendance_status(attendance_status); idx_attendance_lookup(deleted,attendance_checkin_date,employee_id)
COLUMNS:
  daily_actual_attendance_id          int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  multiple_checkin_n_out_status       int(11)              Null:NO  Key:    Default:'0'
  attendance_checkin_mode_type        int(11)              Null:NO  Key:    Default:'0'
  attendance_checkout_mode_type       int(11)              Null:NO  Key:    Default:'0'
  shift_id                            int(11)              Null:NO  Key:    Default:'0'
  entry_type                          int(11)              Null:NO  Key:    Default:'0'
  attendance_checkin_date             date                 Null:YES Key:MUL Default:'NULL'
  attendance_checkout_date            date                 Null:YES Key:    Default:'NULL'
  checkin_time                        time                 Null:YES Key:    Default:'NULL'
  checkout_time                       time                 Null:YES Key:    Default:'NULL'
  checkin_latitude                    decimal(11,8)        Null:YES Key:    Default:'NULL'
  checkin_longitude                   decimal(11,8)        Null:YES Key:    Default:'NULL'
  checkout_latitude                   decimal(11,8)        Null:YES Key:    Default:'NULL'
  checkout_longitude                  decimal(11,8)        Null:YES Key:    Default:'NULL'
  checkin_address                     varchar(200)         Null:YES Key:    Default:'NULL'
  checkout_address                    varchar(200)         Null:YES Key:    Default:'NULL'
  checkin_location                    text                 Null:YES Key:    Default:'NULL'
  checkout_location                   text                 Null:YES Key:    Default:'NULL'
  attendance_checkin_image            varchar(500)         Null:YES Key:    Default:'NULL'
  attendance_checkout_image           varchar(500)         Null:YES Key:    Default:'NULL'
  total_work_duration                 time                 Null:YES Key:    Default:'NULL'
  total_overtime                      time                 Null:YES Key:    Default:'NULL'
  total_break_duration                time                 Null:YES Key:    Default:'NULL'
  total_permission_duration           time                 Null:YES Key:    Default:'NULL'
  missed_check_out_status             int(11)              Null:NO  Key:    Default:'0'
  holiday_id                          int(11)              Null:NO  Key:    Default:'0'
  lop_status                          int(11)              Null:NO  Key:    Default:'0'
  attendance_status                   int(11)              Null:NO  Key:MUL Default:'0'
  emp_day_status                      int(11)              Null:NO  Key:    Default:'0'
  work_compensation_status            int(11)              Null:NO  Key:    Default:'0'
  work_compensation_remarks           text                 Null:YES Key:    Default:'NULL'
  modification_status                 int(11)              Null:NO  Key:    Default:'0'
  missed_clock_out_status             int(11)              Null:NO  Key:    Default:'0'
  late_processed                      int(11)              Null:NO  Key:    Default:'0'
  early_time                          time                 Null:YES Key:    Default:'NULL'
  late_time                           time                 Null:YES Key:    Default:'NULL'
  clcokin_face_img                    text                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:    Default:'0'
  deleted                             int(11)              Null:NO  Key:MUL Default:'0'

=============================================================================
12. gs_daily_actual_attendance_log (PK: daily_actual_attendance_log_id, Columns: 42)
=============================================================================
INDEXES: PRIMARY(daily_actual_attendance_log_id)[UNIQUE]; idx_employee_id(employee_id); idx_attendance_checkin_date(attendance_checkin_date); idx_attendance_status(attendance_status)
COLUMNS:
  daily_actual_attendance_log_id      int(11)              Null:NO  Key:PRI Default:NULL
  daily_actual_attendance_id          int(11)              Null:NO  Key:    Default:'0'
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  multiple_checkin_n_out_status       int(11)              Null:NO  Key:    Default:'0'
  attendance_checkin_mode_type        int(11)              Null:NO  Key:    Default:'0'
  attendance_checkout_mode_type       int(11)              Null:NO  Key:    Default:'0'
  shift_id                            int(11)              Null:NO  Key:    Default:'0'
  entry_type                          int(11)              Null:NO  Key:    Default:'0'
  attendance_checkin_date             date                 Null:YES Key:MUL Default:'NULL'
  attendance_checkout_date            date                 Null:YES Key:    Default:'NULL'
  checkin_time                        time                 Null:YES Key:    Default:'NULL'
  checkout_time                       time                 Null:YES Key:    Default:'NULL'
  checkin_latitude                    decimal(10,8)        Null:YES Key:    Default:'NULL'
  checkin_longitude                   decimal(10,8)        Null:YES Key:    Default:'NULL'
  checkout_latitude                   decimal(10,8)        Null:YES Key:    Default:'NULL'
  checkout_longitude                  decimal(10,8)        Null:YES Key:    Default:'NULL'
  checkin_address                     varchar(200)         Null:YES Key:    Default:'NULL'
  checkout_address                    varchar(200)         Null:YES Key:    Default:'NULL'
  checkin_location                    text                 Null:YES Key:    Default:'NULL'
  checkout_location                   text                 Null:YES Key:    Default:'NULL'
  attendance_checkin_image            varchar(500)         Null:YES Key:    Default:'NULL'
  attendance_checkout_image           varchar(500)         Null:YES Key:    Default:'NULL'
  total_work_duration                 time                 Null:YES Key:    Default:'NULL'
  total_overtime                      time                 Null:YES Key:    Default:'NULL'
  total_break_duration                time                 Null:YES Key:    Default:'NULL'
  missed_check_out_status             int(11)              Null:NO  Key:    Default:'0'
  holiday_id                          int(11)              Null:NO  Key:    Default:'0'
  lop_status                          int(11)              Null:NO  Key:    Default:'0'
  attendance_status                   int(11)              Null:NO  Key:MUL Default:'0'
  emp_day_status                      int(11)              Null:NO  Key:    Default:'0'
  work_compensation_status            int(11)              Null:NO  Key:    Default:'0'
  work_compensation_remarks           text                 Null:YES Key:    Default:'NULL'
  modification_status                 int(11)              Null:NO  Key:    Default:'0'
  missed_clock_out_status             int(11)              Null:NO  Key:    Default:'0'
  late_processed                      int(11)              Null:NO  Key:    Default:'0'
  early_time                          time                 Null:YES Key:    Default:'NULL'
  late_time                           time                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:    Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
13. gs_daily_actual_attendance_tempcsv (PK: temp_id, Columns: 13)
=============================================================================
INDEXES: PRIMARY(temp_id)[UNIQUE]; idx_gs_daily_actual_attendance_tempcsv_session(sessionID); idx_gs_daily_actual_attendance_tempcsv_status_available(status,available); idx_gs_daily_actual_attendance_tempcsv_created_updated(createdon,updatedon)
COLUMNS:
  temp_id                             int(11)              Null:NO  Key:PRI Default:NULL
  csvtype                             int(11)              Null:YES Key:    Default:'NULL'
  sessionID                           varchar(250)         Null:YES Key:MUL Default:'NULL'
  field1                              varchar(250)         Null:YES Key:    Default:'NULL'
  field2                              varchar(250)         Null:YES Key:    Default:'NULL'
  field3                              varchar(250)         Null:YES Key:    Default:'NULL'
  field4                              varchar(250)         Null:YES Key:    Default:'NULL'
  field5                              varchar(250)         Null:YES Key:    Default:'NULL'
  field6                              varchar(250)         Null:YES Key:    Default:'NULL'
  available                           int(11)              Null:YES Key:    Default:'0'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'

=============================================================================
14. gs_daily_attendance_history (PK: attendance_history_id, Columns: 28)
=============================================================================
INDEXES: PRIMARY(attendance_history_id)[UNIQUE]; idx_employee_id(employee_id); idx_attendance_id(attendance_id)
COLUMNS:
  attendance_history_id               int(11)              Null:NO  Key:PRI Default:NULL
  attendance_id                       int(11)              Null:NO  Key:MUL Default:'0'
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  attendance_checkin_mode_type        int(11)              Null:NO  Key:    Default:'0'
  attendance_checkout_mode_type       int(11)              Null:NO  Key:    Default:'0'
  attendance_checkin_date             date                 Null:YES Key:    Default:'NULL'
  checkin_time                        time                 Null:YES Key:    Default:'NULL'
  checkin_ipaddress                   varchar(200)         Null:YES Key:    Default:'NULL'
  checkin_latitude                    decimal(11,8)        Null:YES Key:    Default:'NULL'
  checkin_longitude                   decimal(11,8)        Null:YES Key:    Default:'NULL'
  checkin_location                    varchar(500)         Null:YES Key:    Default:'NULL'
  checkin_address                     varchar(250)         Null:YES Key:    Default:'NULL'
  attendance_checkout_date            date                 Null:YES Key:    Default:'NULL'
  checkout_time                       time                 Null:YES Key:    Default:'NULL'
  checkout_ipaddress                  varchar(200)         Null:YES Key:    Default:'NULL'
  checkout_latitude                   decimal(11,8)        Null:YES Key:    Default:'NULL'
  checkout_longitude                  decimal(11,8)        Null:YES Key:    Default:'NULL'
  checkout_address                    varchar(250)         Null:YES Key:    Default:'NULL'
  checkout_location                   varchar(500)         Null:YES Key:    Default:'NULL'
  attendance_checkin_image            varchar(500)         Null:YES Key:    Default:'NULL'
  attendance_checkout_image           varchar(500)         Null:YES Key:    Default:'NULL'
  total_work_duration                 time                 Null:YES Key:    Default:'NULL'
  total_break_duration                time                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:    Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
15. gs_daily_break_time (PK: daily_break_time_id, Columns: 23)
=============================================================================
INDEXES: PRIMARY(daily_break_time_id)[UNIQUE]; idx_gs_daily_break_time_attendance(daily_actual_attendance_id); idx_gs_daily_break_time_employee(employee_id); idx_gs_daily_break_time_date(attendance_breakin_date); idx_gs_daily_break_time_status_deleted(status,deleted); idx_gs_daily_break_time_created_updated(createdon,updatedon); idx_gs_daily_break_time_createdby(createdby)
COLUMNS:
  daily_break_time_id                 int(11)              Null:NO  Key:PRI Default:NULL
  daily_actual_attendance_id          int(11)              Null:NO  Key:MUL Default:'0'
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  attendance_breakin_date             date                 Null:YES Key:MUL Default:'NULL'
  attendance_breakout_date            date                 Null:YES Key:    Default:'NULL'
  break_duration                      time                 Null:YES Key:    Default:'NULL'
  break_in                            time                 Null:YES Key:    Default:'NULL'
  break_out                           time                 Null:YES Key:    Default:'NULL'
  breakin_latitude                    decimal(11,8)        Null:YES Key:    Default:'NULL'
  breakout_latitude                   decimal(11,8)        Null:YES Key:    Default:'NULL'
  breakin_longitude                   decimal(11,8)        Null:YES Key:    Default:'NULL'
  breakout_longitude                  decimal(11,8)        Null:YES Key:    Default:'NULL'
  breakin_address                     varchar(250)         Null:YES Key:    Default:'NULL'
  breakout_address                    varchar(250)         Null:YES Key:    Default:'NULL'
  breakin_location                    text                 Null:YES Key:    Default:'NULL'
  breakout_location                   text                 Null:YES Key:    Default:'NULL'
  break_type                          int(11)              Null:NO  Key:    Default:'0'
  break_reason                        varchar(500)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
16. gs_daily_late_attendance_log (PK: late_attendance_log_ID, Columns: 16)
=============================================================================
INDEXES: PRIMARY(late_attendance_log_ID)[UNIQUE]; idx_employee_id(employee_id); idx_attendance_id(attendance_id); idx_late_settings_ID(late_settings_ID); idx_attendance_date(attendance_date)
COLUMNS:
  late_attendance_log_ID              int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  late_settings_ID                    int(11)              Null:YES Key:MUL Default:'NULL'
  attendance_id                       int(11)              Null:NO  Key:MUL Default:'0'
  attendance_date                     date                 Null:YES Key:MUL Default:'NULL'
  shift_start_time                    time                 Null:YES Key:    Default:'NULL'
  actual_arrival_time                 time                 Null:YES Key:    Default:'NULL'
  total_late_duration                 time                 Null:YES Key:    Default:'NULL'
  late_count                          int(11)              Null:YES Key:    Default:'1'
  lop_status                          varchar(50)          Null:YES Key:    Default:'NULL'
  remarks                             text                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:YES Key:    Default:'NULL'
  createdon                           datetime             Null:YES Key:    Default:'current_timestamp()'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(1)           Null:YES Key:    Default:'0'
  deleted                             tinyint(1)           Null:YES Key:    Default:'0'

=============================================================================
17. gs_daily_permission_punches (PK: permission_punch_id, Columns: 25)
=============================================================================
INDEXES: PRIMARY(permission_punch_id)[UNIQUE]; idx_emp_date(employee_id,punch_date); idx_perm_debit(permission_debit_id); idx_attendance(daily_actual_attendance_id)
COLUMNS:
  permission_punch_id                 int(11)              Null:NO  Key:PRI Default:NULL
  permission_debit_id                 int(11)              Null:NO  Key:MUL Default:'0'
  daily_actual_attendance_id          int(11)              Null:NO  Key:MUL Default:'0'
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  punch_date                          date                 Null:YES Key:    Default:'NULL'
  permission_exit_time                time                 Null:YES Key:    Default:'NULL'
  permission_return_time              time                 Null:YES Key:    Default:'NULL'
  permission_taken_duration           time                 Null:YES Key:    Default:'NULL'
  exit_latitude                       decimal(11,8)        Null:YES Key:    Default:'NULL'
  exit_longitude                      decimal(11,8)        Null:YES Key:    Default:'NULL'
  exit_location                       text                 Null:YES Key:    Default:'NULL'
  return_latitude                     decimal(11,8)        Null:YES Key:    Default:'NULL'
  return_longitude                    decimal(11,8)        Null:YES Key:    Default:'NULL'
  return_location                     text                 Null:YES Key:    Default:'NULL'
  is_delayed_return                   tinyint(1)           Null:NO  Key:    Default:'0'
  delay_duration                      time                 Null:YES Key:    Default:''00:00:00''
  make_up_minutes_required            int(11)              Null:NO  Key:    Default:'0'
  is_regularized                      tinyint(1)           Null:NO  Key:    Default:'0'
  regularization_reason               text                 Null:YES Key:    Default:'NULL'
  regularized_by                      int(11)              Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'current_timestamp()'
  updatedon                           datetime             Null:YES Key:    Default:'current_timestamp()'
  status                              tinyint(1)           Null:NO  Key:    Default:'1'
  deleted                             tinyint(1)           Null:NO  Key:    Default:'0'

=============================================================================
18. gs_department (PK: department_id, Columns: 8)
=============================================================================
INDEXES: PRIMARY(department_id)[UNIQUE]; idx_gs_department_name(department_name); idx_gs_department_code(department_code); idx_gs_department_status_deleted(status,deleted); idx_gs_department_created_updated(createdon,updatedon); idx_gs_department_createdby(createdby)
COLUMNS:
  department_id                       int(11)              Null:NO  Key:PRI Default:NULL
  department_name                     varchar(150)         Null:YES Key:MUL Default:'NULL'
  department_code                     varchar(50)          Null:YES Key:MUL Default:'NULL'
  createdby                           int(11)              Null:YES Key:MUL Default:'NULL'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:MUL Default:'0'
  deleted                             tinyint(1)           Null:YES Key:    Default:'0'

=============================================================================
19. gs_designation (PK: designation_id, Columns: 31)
=============================================================================
INDEXES: PRIMARY(designation_id)[UNIQUE]; idx_gs_designation_department(department_id); idx_gs_designation_title(designation_title); idx_gs_designation_status_deleted(status,deleted); idx_gs_designation_created_updated(createdon,updatedon); idx_gs_designation_createdby(createdby)
COLUMNS:
  designation_id                      int(11)              Null:NO  Key:PRI Default:NULL
  department_id                       int(11)              Null:NO  Key:MUL Default:'0'
  designation_title                   varchar(150)         Null:YES Key:MUL Default:'NULL'
  multiple_clock_in_n_out             int(11)              Null:NO  Key:    Default:'0'
  overtime_applicable                 int(11)              Null:NO  Key:    Default:'0'
  employee_pay_type                   int(11)              Null:NO  Key:    Default:'0'
  employee_pay_mode                   int(11)              Null:NO  Key:    Default:'0'
  basic_rate_percentage               decimal(10,2)        Null:YES Key:    Default:'NULL'
  dearness_allowence_rate_percentage  decimal(10,2)        Null:YES Key:    Default:'NULL'
  house_rent_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  conveyance_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  children_education_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  leave_travel_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  special_allowance_rate_percentage   decimal(10,2)        Null:YES Key:    Default:'NULL'
  out_station_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  personal_allowance_rate_percentage  decimal(10,2)        Null:YES Key:    Default:'NULL'
  food_coupons_rate_percentage        decimal(10,2)        Null:YES Key:    Default:'NULL'
  driver_reimbursement_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  fuel_reimbursement_rate_percentage  decimal(10,2)        Null:YES Key:    Default:'NULL'
  minimum_working_hours               int(11)              Null:NO  Key:    Default:'0'
  maximum_working_hours               int(11)              Null:NO  Key:    Default:'0'
  per_day_rate_for_max_hours          decimal(10,2)        Null:YES Key:    Default:'NULL'
  addtional_hours_applicable          int(11)              Null:NO  Key:    Default:'0'
  additional_hour_rate                decimal(10,2)        Null:YES Key:    Default:'NULL'
  hourly_rate                         decimal(10,2)        Null:YES Key:    Default:'NULL'
  tds_percentage                      float                Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:MUL Default:'0'
  deleted                             tinyint(1)           Null:NO  Key:    Default:'0'

=============================================================================
20. gs_designation_payroll_components (PK: designation_payroll_component_ID, Columns: 9)
=============================================================================
INDEXES: PRIMARY(designation_payroll_component_ID)[UNIQUE]; designation_id(designation_id); payroll_component_settings_ID(payroll_component_settings_ID)
COLUMNS:
  designation_payroll_component_ID    int(11)              Null:NO  Key:PRI Default:NULL
  designation_id                      int(11)              Null:NO  Key:MUL Default:'0'
  payroll_component_settings_ID       int(11)              Null:NO  Key:MUL Default:'0'
  component_value                     decimal(10,2)        Null:NO  Key:    Default:'0.00'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:    Default:'0'
  deleted                             tinyint(4)           Null:NO  Key:    Default:'0'

=============================================================================
21. gs_documenttype (PK: documenttype_id, Columns: 7)
=============================================================================
INDEXES: PRIMARY(documenttype_id)[UNIQUE]; idx_gs_documenttype_title(documenttype_title); idx_gs_documenttype_status_deleted(status,deleted); idx_gs_documenttype_created_updated(createdon,updatedon); idx_gs_documenttype_createdby(createdby)
COLUMNS:
  documenttype_id                     int(11)              Null:NO  Key:PRI Default:NULL
  documenttype_title                  varchar(150)         Null:YES Key:MUL Default:'NULL'
  createdby                           int(11)              Null:YES Key:MUL Default:'NULL'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:MUL Default:'0'
  deleted                             tinyint(1)           Null:NO  Key:    Default:'0'

=============================================================================
22. gs_emp_device_log (PK: emp_device_log_id, Columns: 11)
=============================================================================
INDEXES: PRIMARY(emp_device_log_id)[UNIQUE]
COLUMNS:
  emp_device_log_id                   int(11)              Null:NO  Key:PRI Default:NULL
  employee_ID                         int(11)              Null:NO  Key:    Default:'0'
  emp_device_id                       varchar(500)         Null:YES Key:    Default:'NULL'
  emp_device_name                     text                 Null:YES Key:    Default:'NULL'
  emp_device_last_active_time         time                 Null:YES Key:    Default:'NULL'
  emp_device_last_active_date         date                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:    Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
23. gs_employee (PK: employee_ID, Columns: 149)
=============================================================================
INDEXES: PRIMARY(employee_ID)[UNIQUE]; idx_gs_employee_code(emp_code); idx_gs_employee_name(emp_name); idx_gs_employee_department(emp_department); idx_gs_employee_designation(emp_designation); idx_gs_employee_email(emp_emailid); idx_gs_employee_phone(emp_phoneno); idx_gs_employee_status_deleted(status,deleted); idx_gs_employee_created_updated(createdon,updatedon); idx_gs_employee_createdby(createdby); idx_emp_status_deleted_dept(status,deleted,emp_department); idx_emp_status_deleted_desig(status,deleted,emp_designation)
COLUMNS:
  employee_ID                         int(11)              Null:NO  Key:PRI Default:NULL
  emp_vertical                        varchar(100)         Null:YES Key:    Default:'NULL'
  emp_zone                            varchar(100)         Null:YES Key:    Default:'NULL'
  emp_company_code                    varchar(100)         Null:YES Key:    Default:'NULL'
  emp_new_company_id                  int(11)              Null:YES Key:    Default:'0'
  emp_costcent                        varchar(100)         Null:YES Key:    Default:'NULL'
  emp_division                        varchar(100)         Null:YES Key:    Default:'NULL'
  emp_division_name                   varchar(100)         Null:YES Key:    Default:'NULL'
  emp_already_logged_in               int(11)              Null:NO  Key:    Default:'0'
  emp_face_identity_ID                int(11)              Null:NO  Key:    Default:'0'
  emp_code                            varchar(100)         Null:YES Key:MUL Default:'NULL'
  emp_name                            varchar(100)         Null:YES Key:MUL Default:'NULL'
  emp_passcode                        varchar(100)         Null:YES Key:    Default:'NULL'
  emp_device_id                       varchar(500)         Null:YES Key:    Default:'NULL'
  emp_device_name                     text                 Null:YES Key:    Default:'NULL'
  emp_device_last_active_time         time                 Null:YES Key:    Default:'NULL'
  emp_device_last_active_date         date                 Null:YES Key:    Default:'NULL'
  emp_token                           varchar(500)         Null:YES Key:    Default:'NULL'
  emp_clockin_location_restriction    int(11)              Null:NO  Key:    Default:'0'
  emp_checkin_notification            int(11)              Null:NO  Key:    Default:'0'
  emp_checkout_notification           int(11)              Null:NO  Key:    Default:'0'
  last_checkin_notification_sent      datetime             Null:YES Key:    Default:'NULL'
  last_checkout_notification_sent     datetime             Null:YES Key:    Default:'NULL'
  emp_default_passcode_used           int(11)              Null:NO  Key:    Default:'0'
  emp_passcode_update                 int(11)              Null:NO  Key:    Default:'0'
  emp_department                      int(11)              Null:NO  Key:MUL Default:'0'
  emp_unit_id                         int(11)              Null:NO  Key:    Default:'0'
  emp_designation                     int(11)              Null:NO  Key:MUL Default:'0'
  emp_dob                             date                 Null:YES Key:    Default:'NULL'
  emp_personal_email_address          varchar(50)          Null:YES Key:    Default:'NULL'
  emp_gender                          int(11)              Null:NO  Key:    Default:'0'
  emp_marital_status                  tinyint(1)           Null:NO  Key:    Default:'1'
  emp_profile                         varchar(500)         Null:YES Key:    Default:'NULL'
  emp_face_recognize_img              varchar(500)         Null:YES Key:    Default:'NULL'
  emp_face_recognize_status           tinyint(1)           Null:NO  Key:    Default:'0'
  emp_countrycode                     varchar(20)          Null:YES Key:    Default:''+91''
  emp_phoneno                         varchar(50)          Null:YES Key:MUL Default:'NULL'
  emp_emailid                         varchar(50)          Null:YES Key:MUL Default:'NULL'
  emp_address                         varchar(150)         Null:YES Key:    Default:'NULL'
  emp_address_2                       varchar(150)         Null:YES Key:    Default:'NULL'
  emp_postalcode                      varchar(10)          Null:YES Key:    Default:'NULL'
  emp_city                            varchar(50)          Null:YES Key:    Default:'NULL'
  emp_country                         varchar(50)          Null:YES Key:    Default:'NULL'
  emp_state                           varchar(50)          Null:YES Key:    Default:'NULL'
  emp_father_name                     varchar(50)          Null:YES Key:    Default:'NULL'
  emp_doj                             date                 Null:YES Key:    Default:'NULL'
  emp_pf_applicable                   int(11)              Null:NO  Key:    Default:'0'
  emp_uan_num                         varchar(50)          Null:YES Key:    Default:'NULL'
  emp_pf_no                           varchar(50)          Null:YES Key:    Default:'NULL'
  emp_esi_applicable                  int(11)              Null:NO  Key:    Default:'0'
  emp_esi_num                         varchar(50)          Null:YES Key:    Default:'NULL'
  emp_pan_no                          varchar(20)          Null:YES Key:    Default:'NULL'
  emp_aadhar_no                       varchar(20)          Null:YES Key:    Default:'NULL'
  emp_work_location                   varchar(150)         Null:YES Key:    Default:'NULL'
  emp_bank_id                         text                 Null:YES Key:    Default:'NULL'
  emp_bank_detail_id                  text                 Null:YES Key:    Default:'NULL'
  emp_bank_acc_no                     varchar(100)         Null:YES Key:    Default:'NULL'
  emp_bank_reference                  varchar(150)         Null:YES Key:    Default:'NULL'
  emp_bank_ifsc_code                  varchar(20)          Null:YES Key:    Default:'NULL'
  emp_basic_rate_percentage           decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_basic_rate                      decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_basic_rate_annual               decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_dearness_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_dearness_allowance_rate         decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_dearness_allowance_rate_annual  decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_house_rent_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_house_rent_allowance_rate       decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_house_rent_allowance_rate_annual decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_conveyance_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_other_allowance_rate            float                Null:NO  Key:    Default:'0'
  emp_other_allowance_rate_annual     float                Null:NO  Key:    Default:'0'
  emp_conveyance_allowance_rate       decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_conveyance_allowance_rate_annual decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_children_education_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_children_education_allowance_rate decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_children_education_allowance_rate_annual decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_leave_travel_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_leave_travel_allowance_rate     decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_leave_travel_allowance_rate_annual decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_special_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_special_allowance_rate          decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_special_allowance_rate_annual   decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_out_station_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_out_station_allowance_rate      decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_out_station_allowance_rate_annual decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_personal_allowance_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_personal_allowance_rate         decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_personal_allowance_rate_annual  decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_food_coupons_rate_percentage    decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_food_coupons_rate               decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_food_coupons_rate_annual        decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_driver_reimbursement_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_driver_reimbursement_rate       decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_driver_reimbursement_rate_annual decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_fuel_reimbursement_rate_percentage decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_fuel_reimbursement_rate         decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_fuel_reimbursement_rate_annual  decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_fixed_per_hour_rate             decimal(10,2)        Null:NO  Key:    Default:'0.00'
  emp_fixed_gross                     decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_fixed_gross_annual              decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_minimum_working_hours           int(11)              Null:NO  Key:    Default:'0'
  emp_maximum_working_hours           int(11)              Null:NO  Key:    Default:'0'
  emp_per_day_rate_for_max_hours      decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_addtional_hours_applicable      int(11)              Null:NO  Key:    Default:'0'
  emp_additional_hour_rate            decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_hourly_rate                     decimal(10,2)        Null:YES Key:    Default:'NULL'
  emp_tds_percentage                  float                Null:NO  Key:    Default:'0'
  emp_loan_paymode                    int(11)              Null:NO  Key:    Default:'1'
  total_el_credited                   float                Null:NO  Key:    Default:'0'
  total_el_used                       float                Null:NO  Key:    Default:'0'
  total_el_available                  float                Null:NO  Key:    Default:'0'
  cl_leave_type                       int(11)              Null:NO  Key:    Default:'0'
  total_cl_credited                   float                Null:NO  Key:    Default:'0'
  total_cl_used                       float                Null:NO  Key:    Default:'0'
  total_cl_available                  float                Null:NO  Key:    Default:'0'
  sl_leave_type                       int(11)              Null:NO  Key:    Default:'0'
  total_sl_credited                   float                Null:NO  Key:    Default:'0'
  total_sl_used                       float                Null:NO  Key:    Default:'0'
  total_sl_available                  float                Null:NO  Key:    Default:'0'
  total_cml_credited                  float                Null:NO  Key:    Default:'0'
  total_cml_used                      float                Null:NO  Key:    Default:'0'
  total_cml_available                 float                Null:NO  Key:    Default:'0'
  total_msl_credited                  float                Null:NO  Key:    Default:'0'
  total_msl_used                      float                Null:NO  Key:    Default:'0'
  total_msl_available                 float                Null:NO  Key:    Default:'0'
  total_wmsl_available                decimal(5,2)         Null:NO  Key:    Default:'0.00'
  total_wmsl_used                     decimal(5,2)         Null:NO  Key:    Default:'0.00'
  total_wmsl_credited                 decimal(5,2)         Null:NO  Key:    Default:'0.00'
  fl_leave_type                       int(11)              Null:NO  Key:    Default:'0'
  total_fl_credited                   float                Null:NO  Key:    Default:'0'
  total_fl_used                       float                Null:NO  Key:    Default:'0'
  total_fl_available                  float                Null:NO  Key:    Default:'0'
  allowed_hours_per_count             time                 Null:YES Key:    Default:'NULL'
  total_hourly_permission_count_credited int(11)              Null:NO  Key:    Default:'0'
  total_hourly_permission_count_used  int(11)              Null:NO  Key:    Default:'0'
  total_hourly_permission_count_available int(11)              Null:NO  Key:    Default:'0'
  total_hourly_permission_hours_credited time                 Null:YES Key:    Default:'NULL'
  total_hourly_permission_hours_used  time                 Null:YES Key:    Default:'NULL'
  total_hourly_permission_hours_available time                 Null:YES Key:    Default:'NULL'
  emp_status                          int(11)              Null:NO  Key:    Default:'0'
  probation_period_in_months          int(11)              Null:NO  Key:    Default:'0'
  emp_reporting_manger_yesorno        int(11)              Null:NO  Key:    Default:'0'
  emp_report_department               text                 Null:YES Key:    Default:'NULL'
  emp_timezone                        varchar(250)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
24. gs_employee_advance_payment (PK: advance_pay_ID, Columns: 19)
=============================================================================
INDEXES: PRIMARY(advance_pay_ID)[UNIQUE]; idx_gs_employee_advance_payment_employee(employee_ID); idx_gs_employee_advance_payment_date(advance_payment_date); idx_gs_employee_advance_payment_status_deleted(status,deleted); idx_gs_employee_advance_payment_created_updated(createdon,updatedon); idx_gs_employee_advance_payment_createdby(createdby)
COLUMNS:
  advance_pay_ID                      int(11)              Null:NO  Key:PRI Default:NULL
  employee_ID                         int(11)              Null:NO  Key:MUL Default:'0'
  advance_payment_date                date                 Null:YES Key:MUL Default:'NULL'
  total_holidays                      float                Null:NO  Key:    Default:'0'
  total_working_days                  float                Null:NO  Key:    Default:'0'
  total_present_days                  float                Null:NO  Key:    Default:'0'
  total_paid_days                     float                Null:NO  Key:    Default:'0'
  total_loss_of_pay                   float                Null:NO  Key:    Default:'0'
  total_over_time                     float                Null:NO  Key:    Default:'0'
  total_ot_rate                       float                Null:NO  Key:    Default:'0'
  total_gross_salary                  float                Null:NO  Key:    Default:'0'
  total_allow_advance_limit           float                Null:NO  Key:    Default:'0'
  taken_advance_payment               float                Null:NO  Key:    Default:'0'
  purpose_of_advance_payment          varchar(250)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
25. gs_employee_attendance_location (PK: employee_attendance_location_id, Columns: 10)
=============================================================================
INDEXES: PRIMARY(employee_attendance_location_id)[UNIQUE]; idx_gs_employee_attendance_location_employee(employee_ID); idx_gs_employee_attendance_location_branch(branch_location_id); idx_gs_employee_attendance_location_date(employee_attendance_location_date_from,employee_attendance_location_date_to); idx_gs_employee_attendance_location_status_deleted(status,deleted); idx_gs_employee_attendance_location_created_updated(createdon,updatedon); idx_gs_employee_attendance_location_createdby(createdby)
COLUMNS:
  employee_attendance_location_id     int(11)              Null:NO  Key:PRI Default:NULL
  employee_ID                         int(11)              Null:NO  Key:MUL Default:NULL
  branch_location_id                  int(11)              Null:NO  Key:MUL Default:NULL
  employee_attendance_location_date_from date                 Null:YES Key:MUL Default:'NULL'
  employee_attendance_location_date_to date                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
26. gs_employee_documents (PK: document_ID, Columns: 9)
=============================================================================
INDEXES: PRIMARY(document_ID)[UNIQUE]; idx_gs_employee_documents_employee(employee_ID); idx_gs_employee_documents_documenttype(emp_documenttype_ID); idx_gs_employee_documents_status_deleted(status,deleted); idx_gs_employee_documents_created_updated(createdon,updatedon); idx_gs_employee_documents_createdby(createdby)
COLUMNS:
  document_ID                         int(11)              Null:NO  Key:PRI Default:NULL
  employee_ID                         int(11)              Null:NO  Key:MUL Default:'0'
  emp_documenttype_ID                 int(11)              Null:NO  Key:MUL Default:'0'
  document_name                       varchar(300)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
27. gs_employee_earned_leave_credits_log (PK: earned_leave_id, Columns: 11)
=============================================================================
INDEXES: PRIMARY(earned_leave_id)[UNIQUE]; idx_gs_employee_earned_leave_credits_log_employee(employee_id); idx_gs_employee_earned_leave_credits_log_date(from_date,to_date); idx_gs_employee_earned_leave_credits_log_status_deleted(status,deleted); idx_gs_employee_earned_leave_credits_log_created_updated(createdon,updatedon); idx_gs_employee_earned_leave_credits_log_createdby(createdby)
COLUMNS:
  earned_leave_id                     int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  from_date                           date                 Null:YES Key:MUL Default:'NULL'
  to_date                             date                 Null:YES Key:    Default:'NULL'
  total_leave_credited                float                Null:NO  Key:    Default:'0'
  description                         text                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
28. gs_employee_hourly_leave_permission_credits (PK: employee_hourly_leave_permission_credits_id, Columns: 13)
=============================================================================
INDEXES: PRIMARY(employee_hourly_leave_permission_credits_id)[UNIQUE]; idx_gs_employee_leave_credits_employee(employee_id); idx_gs_employee_leave_credits_type(hourly_leave_permission_type); idx_gs_employee_leave_credits_status_deleted(status,deleted); idx_gs_employee_leave_credits_created_updated(createdon,updatedon); idx_gs_employee_leave_credits_createdby(createdby)
COLUMNS:
  employee_hourly_leave_permission_credits_id int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  hourly_leave_permission_type        int(11)              Null:NO  Key:MUL Default:'0'
  credited_date                       date                 Null:YES Key:    Default:'NULL'
  description                         text                 Null:YES Key:    Default:'NULL'
  total_permission_count_credits      int(11)              Null:NO  Key:    Default:'0'
  allowed_hours_per_count             time                 Null:YES Key:    Default:'NULL'
  total_permission_hours_credits      time                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
29. gs_employee_hourly_leave_permission_debits (PK: employee_hourly_leave_permission_debits_id, Columns: 21)
=============================================================================
INDEXES: PRIMARY(employee_hourly_leave_permission_debits_id)[UNIQUE]; idx_gs_employee_leave_debits_employee(employee_id); idx_gs_employee_leave_debits_type(permission_type); idx_gs_employee_leave_debits_status_deleted(status,deleted); idx_gs_employee_leave_debits_created_updated(createdon,updatedon); idx_gs_employee_leave_debits_createdby(createdby)
COLUMNS:
  employee_hourly_leave_permission_debits_id int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  permission_type                     int(11)              Null:NO  Key:MUL Default:'0'
  permission_date                     date                 Null:YES Key:    Default:'NULL'
  permission_from                     time                 Null:YES Key:    Default:'NULL'
  permission_to                       time                 Null:YES Key:    Default:'NULL'
  permission_count                    int(11)              Null:NO  Key:    Default:'0'
  permitted_hours                     time                 Null:YES Key:    Default:'NULL'
  purpose_of_permission               text                 Null:YES Key:    Default:'NULL'
  permission_approved_on              date                 Null:YES Key:    Default:'NULL'
  permission_approved_by              int(11)              Null:NO  Key:    Default:'0'
  permission_status                   int(11)              Null:NO  Key:    Default:'0'
  permission_canceled_on              date                 Null:YES Key:    Default:'NULL'
  permission_rejected_on              date                 Null:YES Key:    Default:'NULL'
  permission_rejected_by              int(11)              Null:NO  Key:    Default:'0'
  permission_reject_reason            text                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
30. gs_employee_late_r_permission_duration_details (PK: employee_late_r_permission_duration_details_ID, Columns: 21)
=============================================================================
INDEXES: PRIMARY(employee_late_r_permission_duration_details_ID)[UNIQUE]
COLUMNS:
  employee_late_r_permission_duration_details_ID int(11)              Null:NO  Key:PRI Default:NULL
  duration_type                       int(11)              Null:NO  Key:    Default:'0'
  employee_id                         int(11)              Null:NO  Key:    Default:'0'
  late_r_permission_date              date                 Null:YES Key:    Default:'NULL'
  attendance_id                       int(11)              Null:NO  Key:    Default:'0'
  attendance_shift_start_time         time                 Null:YES Key:    Default:'NULL'
  attendance_actual_arrival_time      time                 Null:YES Key:    Default:'NULL'
  permission_from                     time                 Null:YES Key:    Default:'NULL'
  permission_to                       time                 Null:YES Key:    Default:'NULL'
  purpose_of_permission               text                 Null:YES Key:    Default:'NULL'
  permission_status                   int(11)              Null:NO  Key:    Default:'0'
  permission_approved_on              date                 Null:YES Key:    Default:'NULL'
  permission_rejected_on              date                 Null:YES Key:    Default:'NULL'
  reject_reason                       text                 Null:YES Key:    Default:'NULL'
  duration_unit                       int(11)              Null:NO  Key:    Default:'0'
  total_duration_taken                time                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:    Default:'0'
  deleted                             tinyint(4)           Null:NO  Key:    Default:'0'

=============================================================================
31. gs_employee_leave_availability (PK: leave_availability_id, Columns: 16)
=============================================================================
INDEXES: PRIMARY(leave_availability_id)[UNIQUE]; idx_gs_employee_leave_availability_employee(employee_id); idx_gs_employee_leave_availability_date(leave_date); idx_gs_employee_leave_availability_status_deleted(status,deleted); idx_gs_employee_leave_availability_created_updated(createdon,updatedon); idx_gs_employee_leave_availability_createdby(createdby)
COLUMNS:
  leave_availability_id               int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  leave_date                          date                 Null:YES Key:MUL Default:'NULL'
  leave_debit_id                      int(11)              Null:NO  Key:    Default:'0'
  total_cl_available                  float                Null:NO  Key:    Default:'0'
  total_sl_available                  float                Null:NO  Key:    Default:'0'
  total_el_available                  float                Null:NO  Key:    Default:'0'
  total_cml_available                 float                Null:NO  Key:    Default:'0'
  total_fl_available                  float                Null:NO  Key:    Default:'0'
  total_msl_available                 int(11)              Null:NO  Key:    Default:'0'
  total_wmsl_available                decimal(5,2)         Null:NO  Key:    Default:'0.00'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
32. gs_employee_leave_credits (PK: employee_leave_credits_id, Columns: 22)
=============================================================================
INDEXES: PRIMARY(employee_leave_credits_id)[UNIQUE]; idx_gs_employee_leave_credits_employee(employee_id); idx_gs_employee_leave_credits_type(leave_type); idx_gs_employee_leave_credits_status_deleted(status,deleted); idx_gs_employee_leave_credits_created_updated(createdon,updatedon); idx_gs_employee_leave_credits_createdby(createdby)
COLUMNS:
  employee_leave_credits_id           int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  leave_type                          int(11)              Null:NO  Key:MUL Default:NULL
  cml_leave_status                    int(11)              Null:NO  Key:    Default:'0'
  el_leave_status                     int(11)              Null:NO  Key:    Default:'0'
  credited_date                       date                 Null:YES Key:    Default:'NULL'
  emp_wo_date                         date                 Null:YES Key:    Default:'NULL'
  description                         text                 Null:YES Key:    Default:'NULL'
  casual_leave_allocation_period      int(11)              Null:NO  Key:    Default:'0'
  allow_casual_leave                  decimal(4,2)         Null:NO  Key:    Default:'0.00'
  sick_leave_allocation_period        int(11)              Null:NO  Key:    Default:'0'
  allow_sick_leave                    decimal(4,2)         Null:NO  Key:    Default:'0.00'
  menstrual_leave_allocation_period   int(11)              Null:NO  Key:    Default:'0'
  allow_menstrual_leave               decimal(4,2)         Null:NO  Key:    Default:'0.00'
  festival_leave_allocation_period    int(11)              Null:NO  Key:    Default:'0'
  allow_festival_leave                decimal(4,2)         Null:NO  Key:    Default:'0.00'
  total_credits                       float                Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
33. gs_employee_leave_debits (PK: employee_leave_debits_id, Columns: 25)
=============================================================================
INDEXES: PRIMARY(employee_leave_debits_id)[UNIQUE]; idx_gs_employee_leave_debits_employee(employee_id); idx_gs_employee_leave_debits_type(leave_type); idx_gs_employee_leave_debits_status_deleted(status,deleted); idx_gs_employee_leave_debits_created_updated(createdon,updatedon); idx_gs_employee_leave_debits_createdby(createdby)
COLUMNS:
  employee_leave_debits_id            int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  leave_type                          int(11)              Null:NO  Key:MUL Default:'0'
  cml_debit_type                      int(11)              Null:NO  Key:    Default:'0'
  el_debit_type                       int(11)              Null:NO  Key:    Default:'0'
  leave_from                          date                 Null:YES Key:    Default:'NULL'
  leave_to                            date                 Null:YES Key:    Default:'NULL'
  total_no_of_days                    float                Null:NO  Key:    Default:'0'
  leave_day                           int(11)              Null:NO  Key:    Default:'0'
  purpose_of_leave                    text                 Null:YES Key:    Default:'NULL'
  leave_attachment_by                 int(11)              Null:NO  Key:    Default:'0'
  leave_attachment                    varchar(500)         Null:YES Key:    Default:'NULL'
  requested_on                        date                 Null:YES Key:    Default:'NULL'
  approved_on                         date                 Null:YES Key:    Default:'NULL'
  approved_by                         int(11)              Null:NO  Key:    Default:'0'
  leave_status                        int(11)              Null:NO  Key:    Default:'0'
  canceled_on                         date                 Null:YES Key:    Default:'NULL'
  rejected_on                         date                 Null:YES Key:    Default:'NULL'
  rejected_by                         int(11)              Null:NO  Key:    Default:'0'
  reject_reason                       text                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
34. gs_employee_loan (PK: emp_loan_ID, Columns: 14)
=============================================================================
INDEXES: PRIMARY(emp_loan_ID)[UNIQUE]; idx_gs_employee_loan_employee(employee_id); idx_gs_employee_loan_refno(loan_refno); idx_gs_employee_loan_date(loan_date); idx_gs_employee_loan_status_deleted(status,deleted); idx_gs_employee_loan_created_updated(createdon,updatedon); idx_gs_employee_loan_createdby(createdby)
COLUMNS:
  emp_loan_ID                         int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  loan_refno                          varchar(50)          Null:YES Key:MUL Default:'NULL'
  loan_amount                         float                Null:NO  Key:    Default:'0'
  total_loan_paid                     float                Null:NO  Key:    Default:'0'
  total_loan_due                      float                Null:NO  Key:    Default:'0'
  loan_date                           date                 Null:YES Key:MUL Default:'NULL'
  loan_tenure                         int(11)              Null:NO  Key:    Default:'0'
  purpose_of_loan                     varchar(150)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
35. gs_employee_loan_instalment (PK: loan_instalment_ID, Columns: 12)
=============================================================================
INDEXES: PRIMARY(loan_instalment_ID)[UNIQUE]; idx_gs_employee_loan_instalment_loan(emp_loan_ID); idx_gs_employee_loan_instalment_date(instalment_date); idx_gs_employee_loan_instalment_status(instalment_status); idx_gs_employee_loan_instalment_transaction_date(transaction_date); idx_gs_employee_loan_instalment_status_deleted(status,deleted); idx_gs_employee_loan_instalment_created_updated(createdon,updatedon); idx_gs_employee_loan_instalment_createdby(createdby)
COLUMNS:
  loan_instalment_ID                  int(11)              Null:NO  Key:PRI Default:NULL
  emp_loan_ID                         int(11)              Null:NO  Key:MUL Default:'0'
  instalment_date                     date                 Null:YES Key:MUL Default:'NULL'
  instalment_amount                   float                Null:NO  Key:    Default:'0'
  instalment_status                   int(11)              Null:NO  Key:MUL Default:'0'
  transaction_date                    date                 Null:YES Key:MUL Default:'NULL'
  transaction_notes                   varchar(200)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
36. gs_employee_loan_transaction (PK: loan_trans_ID, Columns: 10)
=============================================================================
INDEXES: PRIMARY(loan_trans_ID)[UNIQUE]; idx_gs_employee_loan_transaction_loan(emp_loan_ID); idx_gs_employee_loan_transaction_date(transaction_date); idx_gs_employee_loan_transaction_status_deleted(status,deleted); idx_gs_employee_loan_transaction_created_updated(createdon,updatedon); idx_gs_employee_loan_transaction_createdby(createdby)
COLUMNS:
  loan_trans_ID                       int(11)              Null:NO  Key:PRI Default:NULL
  emp_loan_ID                         int(11)              Null:NO  Key:MUL Default:'0'
  transaction_amount                  float                Null:NO  Key:    Default:'0'
  transaction_date                    date                 Null:YES Key:MUL Default:'NULL'
  transaction_notes                   varchar(300)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
37. gs_employee_payroll_component_details (PK: emp_payroll_component_details_ID, Columns: 16)
=============================================================================
INDEXES: PRIMARY(emp_payroll_component_details_ID)[UNIQUE]
COLUMNS:
  emp_payroll_component_details_ID    int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:    Default:'0'
  designation_payroll_component_id    int(11)              Null:NO  Key:    Default:'0'
  emp_designation_id                  int(11)              Null:NO  Key:    Default:'0'
  payroll_component_settings_id       int(11)              Null:NO  Key:    Default:'0'
  emp_component_type                  int(11)              Null:NO  Key:    Default:'0'
  emp_component_name                  varchar(250)         Null:YES Key:    Default:'NULL'
  emp_component_calculation_type      int(11)              Null:NO  Key:    Default:'0'
  emp_component_value                 decimal(10,2)        Null:NO  Key:    Default:'0.00'
  emp_component_rate_monthly          decimal(10,2)        Null:NO  Key:    Default:'0.00'
  emp_component_rate_annual           decimal(10,2)        Null:NO  Key:    Default:'0.00'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:    Default:'0'
  deleted                             tinyint(4)           Null:NO  Key:    Default:'0'

=============================================================================
38. gs_employee_tempcsv (PK: temp_id, Columns: 20)
=============================================================================
INDEXES: PRIMARY(temp_id)[UNIQUE]; idx_gs_employee_tempcsv_session(sessionID); idx_gs_employee_tempcsv_status_available(status,available); idx_gs_employee_tempcsv_created_updated(createdon,updatedon)
COLUMNS:
  temp_id                             int(11)              Null:NO  Key:PRI Default:NULL
  csvtype                             int(11)              Null:NO  Key:    Default:'0'
  sessionID                           text                 Null:YES Key:MUL Default:'NULL'
  field1                              text                 Null:YES Key:    Default:'NULL'
  field2                              text                 Null:YES Key:    Default:'NULL'
  field3                              text                 Null:YES Key:    Default:'NULL'
  field4                              text                 Null:YES Key:    Default:'NULL'
  field5                              text                 Null:YES Key:    Default:'NULL'
  field6                              text                 Null:YES Key:    Default:'NULL'
  field7                              text                 Null:YES Key:    Default:'NULL'
  field8                              text                 Null:YES Key:    Default:'NULL'
  field9                              text                 Null:YES Key:    Default:'NULL'
  field10                             text                 Null:YES Key:    Default:'NULL'
  field11                             text                 Null:YES Key:    Default:'NULL'
  field12                             text                 Null:YES Key:    Default:'NULL'
  message                             text                 Null:YES Key:    Default:'NULL'
  available                           int(11)              Null:YES Key:    Default:'0'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'

=============================================================================
39. gs_generalsettings (PK: gensetting_id, Columns: 22)
=============================================================================
INDEXES: PRIMARY(gensetting_id)[UNIQUE]; idx_gs_generalsettings_status_deleted(status,deleted); idx_gs_generalsettings_created_updated(createdon,updatedon); idx_gs_generalsettings_createdby(createdby)
COLUMNS:
  gensetting_id                       int(11)              Null:NO  Key:PRI Default:NULL
  gensetting_sitetitle                varchar(255)         Null:YES Key:    Default:'NULL'
  gensetting_sitelogo                 varchar(255)         Null:YES Key:    Default:'NULL'
  gensetting_gstin                    varchar(255)         Null:YES Key:    Default:'NULL'
  gensetting_contact_no               varchar(255)         Null:YES Key:    Default:'NULL'
  gensetting_email                    varchar(255)         Null:YES Key:    Default:'NULL'
  gensetting_address                  varchar(255)         Null:YES Key:    Default:'NULL'
  gensetting_pincode                  varchar(255)         Null:YES Key:    Default:'NULL'
  gensetting_amc_margin               varchar(255)         Null:YES Key:    Default:'NULL'
  gensetting_obsolete_inventory_margin float                Null:YES Key:    Default:'0'
  gensetting_fy_starts_from           varchar(5)           Null:YES Key:    Default:'NULL'
  active_fy_ID                        int(11)              Null:NO  Key:    Default:'0'
  gensetting_timezone                 varchar(250)         Null:YES Key:    Default:'NULL'
  gensetting_invoice_declaration      varchar(500)         Null:YES Key:    Default:'NULL'
  two_fa_status                       int(11)              Null:NO  Key:    Default:'0'
  gensetting_global_currency          int(11)              Null:NO  Key:    Default:'0'
  gensetting_global_country_code      varchar(50)          Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  deleted                             tinyint(1)           Null:NO  Key:    Default:'0'

=============================================================================
40. gs_holiday (PK: holiday_id, Columns: 9)
=============================================================================
INDEXES: PRIMARY(holiday_id)[UNIQUE]; idx_gs_holiday_title(holiday_title); idx_gs_holiday_date(holiday_date); idx_gs_holiday_status_deleted(status,deleted); idx_gs_holiday_created_updated(createdon,updatedon); idx_gs_holiday_createdby(createdby)
COLUMNS:
  holiday_id                          int(11)              Null:NO  Key:PRI Default:NULL
  holiday_title                       varchar(20)          Null:YES Key:MUL Default:'NULL'
  holiday_type                        int(11)              Null:NO  Key:    Default:'0'
  holiday_date                        date                 Null:YES Key:MUL Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(1)           Null:NO  Key:MUL Default:'0'
  deleted                             tinyint(1)           Null:NO  Key:    Default:'0'

=============================================================================
41. gs_late_configuration_settings (PK: late_settings_ID, Columns: 10)
=============================================================================
INDEXES: PRIMARY(late_settings_ID)[UNIQUE]
COLUMNS:
  late_settings_ID                    int(11)              Null:NO  Key:PRI Default:NULL
  clock_in_delay_from                 int(11)              Null:NO  Key:    Default:'0'
  clock_in_delay_to                   int(11)              Null:NO  Key:    Default:'0'
  no_of_times                         int(11)              Null:NO  Key:    Default:'0'
  lop_type                            int(11)              Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:    Default:'0'
  deleted                             tinyint(4)           Null:NO  Key:    Default:'0'

=============================================================================
42. gs_login_attempts (PK: id, Columns: 5)
=============================================================================
INDEXES: PRIMARY(id)[UNIQUE]; idx_ip_time(ip_address,attempt_time); idx_user_time(identifier,attempt_time)
COLUMNS:
  id                                  int(11)              Null:NO  Key:PRI Default:NULL
  ip_address                          varchar(45)          Null:NO  Key:MUL Default:NULL
  identifier                          varchar(191)         Null:NO  Key:MUL Default:NULL
  attempt_time                        int(11)              Null:NO  Key:    Default:NULL
  status                              tinyint(1)           Null:YES Key:    Default:'0'

=============================================================================
43. gs_maintenance_log (PK: maintenance_log_id, Columns: 10)
=============================================================================
INDEXES: PRIMARY(maintenance_log_id)[UNIQUE]; idx_gs_daily_break_time_status_deleted(status,deleted); idx_gs_daily_break_time_created_updated(createdon,updatedon); idx_gs_daily_break_time_createdby(createdby)
COLUMNS:
  maintenance_log_id                  int(11)              Null:NO  Key:PRI Default:NULL
  maintenance_log_start_date_time     datetime             Null:YES Key:    Default:'NULL'
  maintenance_log_end_date_time       datetime             Null:YES Key:    Default:'NULL'
  maintenance_log_title               varchar(500)         Null:YES Key:    Default:'NULL'
  maintenance_log_description         varchar(500)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
44. gs_memo (PK: employee_memo_ID, Columns: 11)
=============================================================================
INDEXES: PRIMARY(employee_memo_ID)[UNIQUE]
COLUMNS:
  employee_memo_ID                    int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:    Default:'0'
  memo_date                           date                 Null:YES Key:    Default:'NULL'
  memo_start_time                     time                 Null:YES Key:    Default:'NULL'
  memo_end_time                       time                 Null:YES Key:    Default:'NULL'
  memo_reason                         text                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:    Default:'0'
  deleted                             tinyint(4)           Null:NO  Key:    Default:'0'

=============================================================================
45. gs_mobile_api_log (PK: gs_mobile_api_ID, Columns: 10)
=============================================================================
INDEXES: PRIMARY(gs_mobile_api_ID)[UNIQUE]; idx_gs_mobile_api_log_employee(employee_ID); idx_gs_mobile_api_log_status_deleted(status,deleted); idx_gs_mobile_api_log_created_updated(createdon,updatedon); idx_gs_mobile_api_log_createdby(createdby)
COLUMNS:
  gs_mobile_api_ID                    int(11)              Null:NO  Key:PRI Default:NULL
  employee_ID                         int(11)              Null:NO  Key:MUL Default:'0'
  api_request_body                    varchar(500)         Null:YES Key:    Default:'NULL'
  subject                             varchar(100)         Null:YES Key:    Default:'NULL'
  description                         text                 Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(1)           Null:NO  Key:MUL Default:'0'
  deleted                             tinyint(1)           Null:NO  Key:    Default:'0'

=============================================================================
46. gs_pagemenu (PK: page_menu_id, Columns: 9)
=============================================================================
INDEXES: PRIMARY(page_menu_id)[UNIQUE]; idx_gs_pagemenu_title(page_title); idx_gs_pagemenu_name(page_name); idx_gs_pagemenu_status_deleted(status,deleted); idx_gs_pagemenu_created_updated(createdon,updatedon); idx_gs_pagemenu_createdby(createdby)
COLUMNS:
  page_menu_id                        int(11)              Null:NO  Key:PRI Default:NULL
  pagemenu_category                   int(11)              Null:NO  Key:    Default:'0'
  page_title                          varchar(50)          Null:YES Key:MUL Default:'NULL'
  page_name                           varchar(50)          Null:YES Key:MUL Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
47. gs_payroll_component_settings (PK: payroll_component_settings_ID, Columns: 13)
=============================================================================
INDEXES: PRIMARY(payroll_component_settings_ID)[UNIQUE]
COLUMNS:
  payroll_component_settings_ID       int(11)              Null:NO  Key:PRI Default:NULL
  component_type                      int(11)              Null:NO  Key:    Default:'0'
  component_name                      varchar(250)         Null:YES Key:    Default:'NULL'
  component_name_in_payslip           varchar(250)         Null:YES Key:    Default:'NULL'
  calculation_type                    int(11)              Null:NO  Key:    Default:'0'
  component_amount                    float                Null:NO  Key:    Default:'0'
  component_status                    int(11)              Null:NO  Key:    Default:'0'
  show_component_in_payslip           int(11)              Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:    Default:'0'
  deleted                             tinyint(4)           Null:NO  Key:    Default:'0'

=============================================================================
48. gs_payslip_actual (PK: actual_payslip_id, Columns: 25)
=============================================================================
INDEXES: PRIMARY(actual_payslip_id)[UNIQUE]; idx_gs_payslip_actual_employee(employee_id); idx_gs_payslip_actual_month(payslip_month); idx_gs_payslip_actual_status_deleted(status,deleted); idx_gs_payslip_actual_created_updated(createdon,updatedon); idx_gs_payslip_actual_createdby(createdby)
COLUMNS:
  actual_payslip_id                   int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  payslip_month                       date                 Null:YES Key:MUL Default:'NULL'
  generated_on                        date                 Null:YES Key:    Default:'NULL'
  total_no_of_days                    float                Null:NO  Key:    Default:'0'
  total_no_week_off_days              float                Null:NO  Key:    Default:'0'
  total_no_of_holidays                float                Null:NO  Key:    Default:'0'
  total_no_of_working_days            float                Null:NO  Key:    Default:'0'
  total_present_days                  float                Null:NO  Key:    Default:'0'
  total_no_of_leave_approved          float                Null:NO  Key:    Default:'0'
  total_paid_days                     float                Null:NO  Key:    Default:'0'
  total_no_of_absent_days             float                Null:NO  Key:    Default:'0'
  total_lop_days                      float                Null:NO  Key:    Default:'0'
  total_overtime_hours                float                Null:NO  Key:    Default:'0'
  total_gross_monthly                 decimal(10,2)        Null:YES Key:    Default:'NULL'
  total_gross_per_day                 decimal(10,2)        Null:YES Key:    Default:'NULL'
  late_attendace_count_occurrences    float                Null:NO  Key:    Default:'0'
  total_reimbursements                decimal(10,2)        Null:YES Key:    Default:'NULL'
  total_deductions                    decimal(10,2)        Null:YES Key:    Default:'NULL'
  net_payable                         decimal(10,2)        Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
49. gs_payslip_actual_log (PK: actual_payslip_log_id, Columns: 26)
=============================================================================
INDEXES: PRIMARY(actual_payslip_log_id)[UNIQUE]; idx_gs_payslip_actual_log_payslip(actual_payslip_id); idx_gs_payslip_actual_log_employee(employee_id); idx_gs_payslip_actual_log_month(payslip_month); idx_gs_payslip_actual_log_status_deleted(status,deleted); idx_gs_payslip_actual_log_created_updated(createdon,updatedon); idx_gs_payslip_actual_log_createdby(createdby)
COLUMNS:
  actual_payslip_log_id               int(11)              Null:NO  Key:PRI Default:NULL
  actual_payslip_id                   int(11)              Null:NO  Key:MUL Default:'0'
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  payslip_month                       date                 Null:YES Key:MUL Default:'NULL'
  generated_on                        date                 Null:YES Key:    Default:'NULL'
  total_no_of_days                    float                Null:NO  Key:    Default:'0'
  total_no_week_off_days              float                Null:NO  Key:    Default:'0'
  total_no_of_holidays                float                Null:NO  Key:    Default:'0'
  total_no_of_working_days            float                Null:NO  Key:    Default:'0'
  total_present_days                  float                Null:NO  Key:    Default:'0'
  total_no_of_leave_approved          float                Null:NO  Key:    Default:'0'
  total_paid_days                     float                Null:NO  Key:    Default:'0'
  total_no_of_absent_days             float                Null:NO  Key:    Default:'0'
  total_lop_days                      float                Null:NO  Key:    Default:'0'
  total_overtime_hours                float                Null:NO  Key:    Default:'0'
  total_gross_monthly                 float                Null:NO  Key:    Default:'0'
  total_gross_per_day                 float                Null:NO  Key:    Default:'0'
  late_attendace_count_occurrences    float                Null:NO  Key:    Default:'0'
  total_reimbursements                float                Null:NO  Key:    Default:'0'
  total_deductions                    float                Null:NO  Key:    Default:'0'
  net_payable                         float                Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
50. gs_payslip_component_details (PK: payslip_component_details_ID, Columns: 15)
=============================================================================
INDEXES: PRIMARY(payslip_component_details_ID)[UNIQUE]; idx_payslip_comp_actual_id(actual_payslip_id); idx_payslip_comp_emp_setting(employee_id,payroll_component_settings_id)
COLUMNS:
  payslip_component_details_ID        int(11)              Null:NO  Key:PRI Default:NULL
  actual_payslip_id                   int(11)              Null:NO  Key:MUL Default:'0'
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  emp_payroll_component_details_id    int(11)              Null:NO  Key:    Default:'0'
  payroll_component_settings_id       int(11)              Null:NO  Key:    Default:'0'
  payroll_component_type              int(11)              Null:NO  Key:    Default:'0'
  payroll_component_name              varchar(250)         Null:YES Key:    Default:'NULL'
  monthly_fixed_component_rate        float                Null:NO  Key:    Default:'0'
  monthly_component_rate              float                Null:NO  Key:    Default:'0'
  per_day_component_rate              float                Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:    Default:'0'
  deleted                             tinyint(4)           Null:NO  Key:    Default:'0'

=============================================================================
51. gs_payslip_component_details_log (PK: payslip_component_details_log_ID, Columns: 16)
=============================================================================
INDEXES: PRIMARY(payslip_component_details_log_ID)[UNIQUE]
COLUMNS:
  payslip_component_details_log_ID    int(11)              Null:NO  Key:PRI Default:NULL
  payslip_component_details_ID        int(11)              Null:NO  Key:    Default:'0'
  actual_payslip_id                   int(11)              Null:NO  Key:    Default:'0'
  employee_id                         int(11)              Null:NO  Key:    Default:'0'
  emp_payroll_component_details_id    int(11)              Null:NO  Key:    Default:'0'
  payroll_component_settings_id       int(11)              Null:NO  Key:    Default:'0'
  payroll_component_type              int(11)              Null:NO  Key:    Default:'0'
  payroll_component_name              varchar(250)         Null:YES Key:    Default:'NULL'
  monthly_fixed_component_rate        float                Null:NO  Key:    Default:'0'
  monthly_component_rate              float                Null:NO  Key:    Default:'0'
  per_day_component_rate              float                Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:    Default:'0'
  deleted                             tinyint(4)           Null:NO  Key:    Default:'0'

=============================================================================
52. gs_pwd_reset_log (PK: pwd_reset_ID, Columns: 11)
=============================================================================
INDEXES: PRIMARY(pwd_reset_ID)[UNIQUE]
COLUMNS:
  pwd_reset_ID                        int(11)              Null:NO  Key:PRI Default:NULL
  email_ID                            text                 Null:YES Key:    Default:'NULL'
  userID                              int(11)              Null:NO  Key:    Default:'0'
  employee_id                         int(11)              Null:NO  Key:    Default:'0'
  reset_key                           text                 Null:YES Key:    Default:'NULL'
  expiry_date                         datetime             Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:    Default:'0'
  createdon                           datetime             Null:YES Key:    Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:    Default:'0'
  deleted                             tinyint(4)           Null:NO  Key:    Default:'0'

=============================================================================
53. gs_rolemenu (PK: role_ID, Columns: 8)
=============================================================================
INDEXES: PRIMARY(role_ID)[UNIQUE]; idx_gs_rolemenu_name(role_name); idx_gs_rolemenu_status_deleted(status,deleted); idx_gs_rolemenu_created_updated(createdon,updatedon); idx_gs_rolemenu_createdby(createdby)
COLUMNS:
  role_ID                             int(11)              Null:NO  Key:PRI Default:NULL
  role_name                           varchar(50)          Null:YES Key:MUL Default:'NULL'
  page_allowed                        varchar(300)         Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
54. gs_security_anomalies (PK: anomaly_id, Columns: 8)
=============================================================================
INDEXES: PRIMARY(anomaly_id)[UNIQUE]; severity(severity); created_at(created_at)
COLUMNS:
  anomaly_id                          int(10) unsigned     Null:NO  Key:PRI Default:NULL
  anomaly_type                        varchar(100)         Null:NO  Key:    Default:NULL
  severity                            enum('LOW','MEDIUM','HIGH','CRITICAL') Null:NO  Key:MUL Default:''MEDIUM''
  actor_id                            int(10) unsigned     Null:YES Key:    Default:'NULL'
  ip_address                          varchar(45)          Null:NO  Key:    Default:NULL
  details                             text                 Null:NO  Key:    Default:NULL
  status                              tinyint(4)           Null:NO  Key:    Default:'1'
  created_at                          timestamp            Null:NO  Key:MUL Default:'current_timestamp()'

=============================================================================
55. gs_security_audit_trail (PK: audit_id, Columns: 14)
=============================================================================
INDEXES: PRIMARY(audit_id)[UNIQUE]; timestamp_utc(timestamp_utc); actor_id(actor_id); entity_type(entity_type,entity_id); action(action)
COLUMNS:
  audit_id                            bigint(20) unsigned  Null:NO  Key:PRI Default:NULL
  timestamp_utc                       datetime             Null:NO  Key:MUL Default:NULL
  actor_id                            int(10) unsigned     Null:YES Key:MUL Default:'NULL'
  actor_type                          varchar(50)          Null:NO  Key:    Default:''user''
  action                              varchar(50)          Null:NO  Key:MUL Default:NULL
  entity_type                         varchar(100)         Null:NO  Key:MUL Default:NULL
  entity_id                           varchar(100)         Null:NO  Key:    Default:NULL
  ip_address                          varchar(45)          Null:NO  Key:    Default:NULL
  user_agent                          varchar(255)         Null:NO  Key:    Default:NULL
  before_state                        longtext             Null:YES Key:    Default:'NULL'
  after_state                         longtext             Null:YES Key:    Default:'NULL'
  previous_hash                       varchar(64)          Null:NO  Key:    Default:NULL
  current_hash                        varchar(64)          Null:NO  Key:    Default:NULL
  created_at                          timestamp            Null:NO  Key:    Default:'current_timestamp()'

=============================================================================
56. gs_shift_details (PK: shift_id, Columns: 14)
=============================================================================
INDEXES: PRIMARY(shift_id)[UNIQUE]; idx_gs_shift_details_title(shift_title); idx_gs_shift_details_code(shift_code); idx_gs_shift_details_status_deleted(status,deleted); idx_gs_shift_details_created_updated(createdon,updatedon); idx_gs_shift_details_createdby(createdby)
COLUMNS:
  shift_id                            int(11)              Null:NO  Key:PRI Default:NULL
  shift_title                         varchar(150)         Null:YES Key:MUL Default:'NULL'
  shift_code                          varchar(50)          Null:YES Key:MUL Default:'NULL'
  shift_start_time                    time                 Null:YES Key:    Default:'NULL'
  shift_end_time                      time                 Null:YES Key:    Default:'NULL'
  default_shift                       int(11)              Null:NO  Key:    Default:'0'
  flexible_shift                      int(11)              Null:NO  Key:    Default:'0'
  total_working_hours                 decimal(4,2)         Null:NO  Key:    Default:'0.00'
  total_break_time                    decimal(4,2)         Null:NO  Key:    Default:'0.00'
  createdby                           int(11)              Null:YES Key:MUL Default:'NULL'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              tinyint(4)           Null:NO  Key:MUL Default:'0'
  deleted                             tinyint(1)           Null:NO  Key:    Default:'0'

=============================================================================
57. gs_shift_schedule (PK: shift_schedule_id, Columns: 40)
=============================================================================
INDEXES: PRIMARY(shift_schedule_id)[UNIQUE]; idx_gs_shift_schedule_employee(employee_id); idx_gs_shift_schedule_month_year(month_of_shift,year_of_shift); idx_gs_shift_schedule_status_deleted(status,deleted); idx_gs_shift_schedule_created_updated(createdon,updatedon); idx_gs_shift_schedule_createdby(createdby)
COLUMNS:
  shift_schedule_id                   int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  month_of_shift                      varchar(100)         Null:YES Key:MUL Default:'NULL'
  year_of_shift                       year(4)              Null:YES Key:    Default:'NULL'
  day_1                               varchar(50)          Null:YES Key:    Default:'NULL'
  day_2                               varchar(50)          Null:YES Key:    Default:'NULL'
  day_3                               varchar(50)          Null:YES Key:    Default:'NULL'
  day_4                               varchar(50)          Null:YES Key:    Default:'NULL'
  day_5                               varchar(50)          Null:YES Key:    Default:'NULL'
  day_6                               varchar(50)          Null:YES Key:    Default:'NULL'
  day_7                               varchar(50)          Null:YES Key:    Default:'NULL'
  day_8                               varchar(50)          Null:YES Key:    Default:'NULL'
  day_9                               varchar(50)          Null:YES Key:    Default:'NULL'
  day_10                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_11                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_12                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_13                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_14                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_15                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_16                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_17                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_18                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_19                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_20                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_21                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_22                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_23                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_24                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_25                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_26                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_27                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_28                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_29                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_30                              varchar(50)          Null:YES Key:    Default:'NULL'
  day_31                              varchar(50)          Null:YES Key:    Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
58. gs_shift_schedule_tempcsv (PK: temp_id, Columns: 41)
=============================================================================
INDEXES: PRIMARY(temp_id)[UNIQUE]; idx_gs_shift_schedule_tempcsv_session(sessionID); idx_gs_shift_schedule_tempcsv_status_available(status,available); idx_gs_shift_schedule_tempcsv_created_updated(createdon,updatedon)
COLUMNS:
  temp_id                             int(11)              Null:NO  Key:PRI Default:NULL
  csvtype                             int(11)              Null:NO  Key:    Default:NULL
  sessionID                           text                 Null:YES Key:MUL Default:'NULL'
  field1                              text                 Null:NO  Key:    Default:NULL
  field2                              text                 Null:NO  Key:    Default:NULL
  field3                              text                 Null:NO  Key:    Default:NULL
  field4                              text                 Null:YES Key:    Default:'NULL'
  field5                              text                 Null:NO  Key:    Default:NULL
  field6                              text                 Null:YES Key:    Default:'NULL'
  field7                              text                 Null:YES Key:    Default:'NULL'
  field8                              text                 Null:NO  Key:    Default:NULL
  field9                              text                 Null:YES Key:    Default:'NULL'
  field10                             text                 Null:YES Key:    Default:'NULL'
  field11                             text                 Null:YES Key:    Default:'NULL'
  field12                             text                 Null:YES Key:    Default:'NULL'
  field13                             text                 Null:YES Key:    Default:'NULL'
  field14                             text                 Null:YES Key:    Default:'NULL'
  field15                             text                 Null:YES Key:    Default:'NULL'
  field16                             text                 Null:YES Key:    Default:'NULL'
  field17                             text                 Null:YES Key:    Default:'NULL'
  field18                             text                 Null:YES Key:    Default:'NULL'
  field19                             text                 Null:YES Key:    Default:'NULL'
  field20                             text                 Null:YES Key:    Default:'NULL'
  field21                             text                 Null:YES Key:    Default:'NULL'
  field22                             text                 Null:YES Key:    Default:'NULL'
  field23                             text                 Null:NO  Key:    Default:NULL
  field24                             text                 Null:YES Key:    Default:'NULL'
  field25                             text                 Null:YES Key:    Default:'NULL'
  field26                             text                 Null:YES Key:    Default:'NULL'
  field27                             text                 Null:YES Key:    Default:'NULL'
  field28                             text                 Null:YES Key:    Default:'NULL'
  field29                             text                 Null:YES Key:    Default:'NULL'
  field30                             text                 Null:YES Key:    Default:'NULL'
  field31                             text                 Null:YES Key:    Default:'NULL'
  field32                             text                 Null:YES Key:    Default:'NULL'
  field33                             text                 Null:YES Key:    Default:'NULL'
  field34                             text                 Null:YES Key:    Default:'NULL'
  available                           int(11)              Null:NO  Key:    Default:'0'
  status                              int(11)              Null:NO  Key:MUL Default:NULL
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'

=============================================================================
59. gs_state (PK: state_id, Columns: 8)
=============================================================================
INDEXES: PRIMARY(state_id)[UNIQUE]; idx_gs_state_country(country_id); idx_gs_state_title(state_title); idx_gs_state_status_deleted(status,deleted); idx_gs_state_created_updated(createdon,updatedon); idx_gs_state_createdby(createdby)
COLUMNS:
  state_id                            int(11)              Null:NO  Key:PRI Default:NULL
  country_id                          int(11)              Null:NO  Key:MUL Default:'0'
  state_title                         varchar(150)         Null:YES Key:MUL Default:'NULL'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

=============================================================================
60. gs_unit (PK: unit_ID, Columns: 8)
=============================================================================
INDEXES: PRIMARY(unit_ID)[UNIQUE]
COLUMNS:
  unit_ID                             int(11)              Null:NO  Key:PRI Default:NULL
  client_ID                           int(11)              Null:NO  Key:    Default:'0'
  unit_name                           varchar(255)         Null:NO  Key:    Default:NULL
  status                              tinyint(1)           Null:NO  Key:    Default:'1'
  deleted                             tinyint(1)           Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:    Default:NULL
  createdon                           datetime             Null:NO  Key:    Default:'current_timestamp()'
  updatedon                           datetime             Null:YES Key:    Default:'NULL'

=============================================================================
61. gs_users (PK: userID, Columns: 20)
=============================================================================
INDEXES: PRIMARY(userID)[UNIQUE]; idx_gs_users_employee(employee_id); idx_gs_users_username(username); idx_gs_users_useremail(useremail); idx_gs_users_role(roleID); idx_gs_users_status_deleted(status,deleted); idx_gs_users_created_updated(createdon,updatedon); idx_gs_users_createdby(createdby)
COLUMNS:
  userID                              int(11)              Null:NO  Key:PRI Default:NULL
  employee_id                         int(11)              Null:NO  Key:MUL Default:'0'
  payrollmanager_ID                   int(11)              Null:YES Key:    Default:'0'
  usertoken                           varchar(100)         Null:YES Key:    Default:'NULL'
  user_profile                        varchar(200)         Null:YES Key:    Default:'NULL'
  username                            varchar(150)         Null:YES Key:MUL Default:'NULL'
  useremail                           varchar(350)         Null:YES Key:MUL Default:'NULL'
  password                            varchar(300)         Null:YES Key:    Default:'NULL'
  roleID                              int(11)              Null:NO  Key:MUL Default:'0'
  google_auth_code                    varchar(16)          Null:YES Key:    Default:'NULL'
  userlogtime                         varchar(50)          Null:YES Key:    Default:'NULL'
  userlogkey                          varchar(50)          Null:YES Key:    Default:'NULL'
  last_loggedon                       datetime             Null:YES Key:    Default:'NULL'
  userapproved                        int(11)              Null:NO  Key:    Default:'1'
  userbanned                          int(11)              Null:NO  Key:    Default:'0'
  createdby                           int(11)              Null:NO  Key:MUL Default:'0'
  createdon                           datetime             Null:YES Key:MUL Default:'NULL'
  updatedon                           timestamp            Null:NO  Key:    Default:'current_timestamp()'
  status                              int(11)              Null:NO  Key:MUL Default:'0'
  deleted                             int(11)              Null:NO  Key:    Default:'0'

`;

export const SQL_FEW_SHOT_EXAMPLES = [
  {
    question: 'Show top 10 highest paid employees with their department and designation',
    sql: `SELECT e.emp_code, e.emp_name, d.department_name, ds.designation_title,
       e.emp_fixed_gross AS monthly_gross, e.emp_fixed_gross_annual AS annual_ctc
FROM gs_employee e
LEFT JOIN gs_department d ON e.emp_department = d.department_id
LEFT JOIN gs_designation ds ON e.emp_designation = ds.designation_id
WHERE (e.deleted = 0 OR e.deleted IS NULL)
ORDER BY e.emp_fixed_gross DESC
LIMIT 10;`,
  },
  {
    question: 'Department-wise total gross salary and employee count',
    sql: `SELECT COALESCE(d.department_name, 'Unassigned') AS department_name,
       COUNT(e.employee_ID) AS employee_count,
       SUM(COALESCE(e.emp_fixed_gross, 0)) AS total_monthly_payroll,
       ROUND(AVG(COALESCE(e.emp_fixed_gross, 0)), 2) AS avg_monthly_salary
FROM gs_employee e
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE (e.deleted = 0 OR e.deleted IS NULL)
GROUP BY d.department_id, d.department_name
ORDER BY total_monthly_payroll DESC;`,
  },
  {
    question: 'Which employees have active loans and what are their remaining balances?',
    sql: `SELECT e.emp_code, e.emp_name, d.department_name,
       l.loan_refno, l.loan_amount, l.total_loan_paid,
       l.total_loan_due AS remaining_balance,
       l.loan_tenure AS tenure_months,
       l.loan_date, l.purpose_of_loan
FROM gs_employee_loan l
JOIN gs_employee e ON l.employee_id = e.employee_ID
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE (l.deleted = 0 OR l.deleted IS NULL) AND l.total_loan_due > 0
ORDER BY l.total_loan_due DESC
LIMIT 20;`,
  },
  {
    question: 'Show recent payslip summary with net payable, gross, and deductions',
    sql: `SELECT p.actual_payslip_id, e.emp_code, e.emp_name, d.department_name,
       DATE_FORMAT(p.payslip_month, '%b %Y') AS month,
       p.total_present_days, p.total_lop_days,
       p.total_gross_monthly, p.total_deductions, p.net_payable
FROM gs_payslip_actual p
JOIN gs_employee e ON p.employee_id = e.employee_ID
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE (p.deleted = 0 OR p.deleted IS NULL)
ORDER BY p.payslip_month DESC, p.actual_payslip_id DESC
LIMIT 15;`,
  },
  {
    question: 'Employees with highest LOP (Loss of Pay) days',
    sql: `SELECT e.emp_code, e.emp_name, d.department_name,
       DATE_FORMAT(p.payslip_month, '%b %Y') AS month,
       p.total_present_days, p.total_lop_days, p.net_payable
FROM gs_payslip_actual p
JOIN gs_employee e ON p.employee_id = e.employee_ID
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE p.total_lop_days > 0 AND (p.deleted = 0 OR p.deleted IS NULL)
ORDER BY p.total_lop_days DESC
LIMIT 10;`,
  },
  {
    question: 'Check available leave balances (Casual, Sick, Earned) for all employees',
    sql: `SELECT e.emp_code, e.emp_name, d.department_name,
       e.total_cl_available AS casual_leave_balance,
       e.total_sl_available AS sick_leave_balance,
       e.total_el_available AS earned_leave_balance,
       e.total_fl_available AS festival_leave_balance,
       e.total_hourly_permission_hours_available AS permission_hours
FROM gs_employee e
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE (e.deleted = 0 OR e.deleted IS NULL)
ORDER BY e.emp_name ASC
LIMIT 30;`,
  },
  {
    question: 'Salary advance taken by employees',
    sql: `SELECT e.emp_code, e.emp_name, d.department_name,
       a.advance_payment_date, a.total_gross_salary,
       a.taken_advance_payment, a.purpose_of_advance_payment
FROM gs_employee_advance_payment a
JOIN gs_employee e ON a.employee_ID = e.employee_ID
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE (a.deleted = 0 OR a.deleted IS NULL)
ORDER BY a.advance_payment_date DESC
LIMIT 20;`,
  },
  {
    question: 'Show overtime hours for employees in a month',
    sql: `SELECT e.emp_code, e.emp_name, d.department_name,
       DATE_FORMAT(p.payslip_month, '%b %Y') AS month,
       p.total_overtime_hours, p.total_present_days,
       p.late_attendace_count_occurrences AS late_count,
       p.net_payable
FROM gs_payslip_actual p
JOIN gs_employee e ON p.employee_id = e.employee_ID
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE p.total_overtime_hours > 0 AND (p.deleted = 0 OR p.deleted IS NULL)
ORDER BY p.total_overtime_hours DESC
LIMIT 15;`,
  },
  {
    question: 'Show employees who have applied for leave recently',
    sql: `SELECT e.emp_code, e.emp_name, d.department_name,
       ld.leave_from, ld.leave_to, ld.total_no_of_days,
       ld.purpose_of_leave,
       CASE ld.leave_status
         WHEN 1 THEN 'Approved'
         WHEN 2 THEN 'Pending'
         WHEN 3 THEN 'Rejected'
         WHEN 4 THEN 'Cancelled'
         ELSE 'Unknown'
       END AS status_label
FROM gs_employee_leave_debits ld
JOIN gs_employee e ON ld.employee_id = e.employee_ID
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE (ld.deleted = 0 OR ld.deleted IS NULL)
ORDER BY ld.requested_on DESC
LIMIT 20;`,
  },
  {
    question: 'Show payslip component breakdown (earnings and deductions) for employees',
    sql: `SELECT e.emp_code, e.emp_name,
       DATE_FORMAT(p.payslip_month, '%b %Y') AS month,
       cd.payroll_component_name,
       CASE cd.payroll_component_type WHEN 1 THEN 'Earning' WHEN 2 THEN 'Deduction' ELSE 'Other' END AS component_type,
       cd.monthly_component_rate AS amount
FROM gs_payslip_component_details cd
JOIN gs_payslip_actual p ON cd.actual_payslip_id = p.actual_payslip_id
JOIN gs_employee e ON cd.employee_id = e.employee_ID
WHERE (cd.deleted = 0 OR cd.deleted IS NULL) AND (p.deleted = 0 OR p.deleted IS NULL)
ORDER BY p.payslip_month DESC, e.emp_name ASC, cd.payroll_component_type ASC
LIMIT 30;`,
  },
  {
    question: 'Show monthly shift schedule assignments',
    sql: `SELECT e.emp_code, e.emp_name, ss.month_of_shift, ss.year_of_shift,
       ss.day_1, ss.day_2, ss.day_3, ss.day_4, ss.day_5, ss.day_6, ss.day_7
FROM gs_shift_schedule ss
JOIN gs_employee e ON ss.employee_id = e.employee_ID
WHERE (ss.deleted = 0 OR ss.deleted IS NULL)
ORDER BY ss.year_of_shift DESC, ss.month_of_shift DESC
LIMIT 20;`,
  },
  {
    question: 'Show all holidays in the calendar',
    sql: `SELECT holiday_title, holiday_date,
       CASE holiday_type WHEN 1 THEN 'Public Holiday' WHEN 2 THEN 'Optional Holiday' ELSE 'Other' END AS holiday_type,
       DAYNAME(holiday_date) AS day_of_week
FROM gs_holiday
WHERE (deleted = 0 OR deleted IS NULL) AND status = 1
ORDER BY holiday_date ASC;`,
  },
  {
    question: 'Who is present today? / யார் யார் இன்று வந்துள்ளார்கள்? / யார் பிரசன்ட்? / Show today present employees',
    sql: `SELECT e.emp_code, e.emp_name, d.department_name,
       a.attendance_checkin_date AS date,
       a.checkin_time, a.checkout_time,
       a.total_work_duration,
       CASE
         WHEN a.attendance_status = 1 THEN 'Full Day'
         WHEN a.attendance_status = 2 THEN 'Half Day'
         WHEN a.attendance_status = 6 THEN 'On Duty'
         WHEN a.checkin_time IS NOT NULL AND a.checkin_time != '00:00:00' THEN 'Checked In (Present)'
         ELSE 'Present'
       END AS attendance_status_label
FROM gs_daily_actual_attendance a
JOIN gs_employee e ON a.employee_id = e.employee_ID
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE (a.deleted = 0 OR a.deleted IS NULL)
  AND a.attendance_checkin_date = (
    CASE 
      WHEN EXISTS (SELECT 1 FROM gs_daily_actual_attendance WHERE attendance_checkin_date = CURDATE() AND (deleted = 0 OR deleted IS NULL))
      THEN CURDATE()
      ELSE (SELECT MAX(attendance_checkin_date) FROM gs_daily_actual_attendance WHERE (deleted = 0 OR deleted IS NULL))
    END
  )
  AND ((a.checkin_time IS NOT NULL AND a.checkin_time != '00:00:00') OR a.attendance_status IN (1, 2, 6))
ORDER BY a.checkin_time ASC, e.emp_name ASC;`,
  },
  {
    question: 'Who is absent today? / யார் யார் ஆப்சன்ட்? / Show absent employees today',
    sql: `SELECT e.emp_code, e.emp_name, d.department_name,
       CURDATE() AS date,
       'Absent' AS status
FROM gs_employee e
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE (e.deleted = 0 OR e.deleted IS NULL)
  AND e.emp_status IN (1, 2, 3)
  AND e.employee_ID NOT IN (
    SELECT a.employee_id
    FROM gs_daily_actual_attendance a
    WHERE (a.deleted = 0 OR a.deleted IS NULL)
      AND a.attendance_checkin_date = (
        CASE 
          WHEN EXISTS (SELECT 1 FROM gs_daily_actual_attendance WHERE attendance_checkin_date = CURDATE() AND (deleted = 0 OR deleted IS NULL))
          THEN CURDATE()
          ELSE (SELECT MAX(attendance_checkin_date) FROM gs_daily_actual_attendance WHERE (deleted = 0 OR deleted IS NULL))
        END
      )
      AND ((a.checkin_time IS NOT NULL AND a.checkin_time != '00:00:00') OR a.attendance_status IN (1, 2, 6))
  )
ORDER BY e.emp_name ASC;`,
  },
  {
    question: 'can i get last month payslip pdf? / Show last month payslips',
    sql: `SELECT p.actual_payslip_id, p.employee_id, e.emp_code, e.emp_name, d.department_name,
       p.payslip_month, p.total_present_days, p.total_lop_days,
       p.total_gross_monthly, p.total_deductions, p.net_payable
FROM gs_payslip_actual p
JOIN gs_employee e ON p.employee_id = e.employee_id
LEFT JOIN gs_department d ON e.emp_department = d.department_id
WHERE (p.deleted = 0 OR p.deleted IS NULL)
ORDER BY p.payslip_month DESC, p.actual_payslip_id DESC
LIMIT 15;`,
  },
];
