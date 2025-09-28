# Automated Physiotherapy Room Scheduler: A Comprehensive Guide

> Google Apps Script application that **fully automates** monthly staff scheduling for a hospital’s physiotherapy room.
> Inputs/outputs live in one Google Sheet; the engine generates a **rule-compliant, balanced** roster with a single run.

---

## Table of Contents

* [1. Project Overview & Core Philosophy](#1-project-overview--core-philosophy)

  * [1.1 High-Level Goal](#11-highlevel-goal)
  * [1.2 Core Philosophy: State-Aware, Proactive Scheduling](#12-core-philosophy-stateaware-proactive-scheduling)
* [2. Glossary of Terms & Nuances](#2-glossary-of-terms--nuances)
* [3. The Google Sheet: The System’s Database](#3-the-google-sheet-the-systems-database)
* [4. The Apps Script Architecture: A Deeper Dive](#4-the-apps-script-architecture-a-deeper-dive)
* [5. The Scheduling Process: Step-by-Step](#5-the-scheduling-process-stepbystep)
* [6. Current Status & Immediate Tasks for AI Agent](#6-current-status--immediate-tasks-for-ai-agent)

---

## 1. Project Overview & Core Philosophy

### 1.1. High-Level Goal

This Google Apps Script application **fully automates** monthly staff scheduling for a hospital’s physiotherapy room—turning a complex manual task into a **reliable, one-click** operation.

* **Input:** A Google Sheet containing staff info, rules, vacations/requests.
* **Output:** A completed, **rule-compliant** schedule written back to the same sheet.

### 1.2. Core Philosophy: State-Aware, Proactive Scheduling

The system avoids the common “generate-then-fix” pattern. Instead, it is **state-aware** and **proactive**:

* Builds **rich, dynamic profiles** for every staff member and every day.
* Each assignment (e.g., assigning 최지희 a `D8`) **instantly updates** both the staff profile and the day profile.
* Before every next decision, the algorithm has a **real-time picture** of: accumulated hours, consecutive workdays, remaining OFF targets, etc.
* This enables **best-possible choices at each step**, so the final schedule is balanced and fair **from the first pass**.

---

## 2. Glossary of Terms & Nuances

| Term                              | Definition & Nuance                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Rich Profile**                  | A JavaScript object for a staff member or a day, holding static attributes **and** live stats updated throughout scheduling.                                 |
| **Context Object**                | The master state for a scheduling run: configuration, all staff profiles, and the grid of daily profiles.                                                    |
| **OFF Day**                       | A scheduled non-work day (not a vacation). The required number is **calculated dynamically** per month.                                                      |
| **Golden Weekend**                | A mandatory **two-day OFF block** (e.g., Fri+Sat) each staff must receive once per month; treated as a **hard constraint** and scheduled early.              |
| **Hospital Shutdown Day (병원휴무일)** | Special holiday type from 📅캘린더. **Zero** required staff; no work shifts assigned. Distinct from **공휴일**, which still requires minimum staffing.             |
| **Shift Categories**              | In ⚙️설정, shifts are grouped (e.g., 일반근무 / 주말근무). The algorithm uses these to determine **valid shifts per day type**.                                        |
| **Best-Fit Shift**                | Instead of defaulting, the engine selects a shift code (e.g., `D8`, `D6`) that best helps a staff member hit their target hours **for that day’s category**. |

---

## 3. The Google Sheet: The System’s Database

> The Sheet is the **single source of truth** and the primary UI.

| Sheet Name              | Purpose & In-Depth Details                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **⚙️ 설정 (Settings)**    | The **brain** of the scheduler. All configuration is here. <br>• **A2:A (이름):** Master staff list. <br>• **E2:H (근무 유형 정의):** **Critical.** Defines all valid shift codes; the engine only writes codes listed here. <br>• **J2:L (규칙 키):** All operational rules (legal limits, day-of-week staffing, etc.). The script is **data-driven** by these values. |
| **⭐ 근무표 (Schedule)**    | **Primary output.** <br>• **B1/C1:** Target year/month (set before running). <br>• **F3 onward:** Final schedule grid. Also used for visual feedback at the end of each test stage.                                                                                                                                                                          |
| **⛱️ 휴가신청 (Vacations)** | Absence input. Only rows with **상태 = 승인 (Approved)** are considered; others are ignored.                                                                                                                                                                                                                                                                     |
| **📅 캘린더 (Calendar)**   | Holiday input. The **구분 (Category)** column distinguishes **공휴일** (requires staff) vs **병원휴무일** (requires **zero** staff).                                                                                                                                                                                                                                   |
| **📈 로그 (Log)**         | Debug output. Cleared and rewritten on every test or full run; receives all operational logs and error messages.                                                                                                                                                                                                                                             |

---

## 4. The Apps Script Architecture: A Deeper Dive

* **Core_Main.gs**
  Adds a custom menu in the spreadsheet and triggers the Orchestrator when the user runs the scheduler.

* **Engine_Schedule_Orchestrator.gs**
  The **manager** that drives the high-level workflow in order and delegates detail work to services. Best file to read for an end-to-end understanding.

* **Engine_Schedule_Assignment.gs**
  The **specialist** implementing the day-by-day **main loop** with score-based assignment of regular work shifts and OFF days.

* **Service_Sheet.gs**
  Data layer: all reads/writes to the Google Sheet. Includes a **pre-write validation** step to prevent invalid data from reaching ⭐근무표.

* **Service_Logger.gs**
  Aggregates logs during a run and writes them in a single batch to 📈로그.

* **Service_Debug.gs**
  Testing framework: runs the process in **discrete stages** via the menu; each stage produces detailed logs and visual feedback by writing intermediate state to ⭐근무표.

* **Util_Date.gs**
  Utilities for date formatting, weekend checks, etc.

---

## 5. The Scheduling Process: Step-by-Step

**The Orchestrator executes stages in this order:**

1. **Stage 1 — Context Initialization**
   Read all data; build the **Context Object**; create **Rich Profiles** for every staff and every day.

2. **Stage 2 — Target Calculation**
   Compute each staff member’s **target OFF days** and **target hours** based on the month’s calendar and their approved vacations.

3. **Stage 3 — Pre-Constraint Application**
   Apply **non-negotiable** assignments first:

   * Place approved **휴가 (vacations)**.
   * Assign **Golden Weekend** OFF blocks (one per staff).

4. **Stage 4 — Main Generation Loop**
   The Assignment Engine iterates **day by day**, assigning **best-fit** work shifts and remaining OFF days based on its scoring/priority rules.

5. **Stage 5 — On-Call (당직) Assignment**
   After the base schedule is complete, scan days requiring on-call duty and **replace** one eligible staff’s regular shift with **`OC10`**, adjusting hours accordingly.

6. **Stage 6 — Final Write**
   Flush the completed schedule from memory (context) to **⭐근무표**.

> **Planned Extension:** See Stage 7 in the next section for post-processing.

---

## 6. Current Status & Immediate Tasks for AI Agent

### Current Status

* ✅ **6-stage testing framework** is fully operational.
* ✅ The system correctly handles: data ingestion, profile creation, target calculation, pre-constraints, the main generation loop, and **on-call assignments**.

### ⚠️ Immediate Tasks & Known Issues

#### A) Implement **Final Balancing and Validation** (Stage 7 — Post-Processing)

* **Problem:** Some staff may finish slightly **over/under** their target hours.
* **Required Action:** Add a **post-processing** stage **after** on-call assignments. The stage scans the completed schedule and performs small, intelligent adjustments (e.g., `D8 → D6` for one person and the reverse for another) to **tighten hour totals** for all staff—**without violating any rules**.

#### B) Enforce **Paired Weekend Work** Rule

* **Problem:** The `enforce_paired_weekend_work` rule exists in **⚙️설정**, but the Assignment Engine **does not** enforce it. A staff member can be assigned to **both Saturday and Sunday** of the same weekend.
* **Required Action:** Update **Engine_Schedule_Assignment.gs** so that when considering a staff member for a **weekend** work shift, it checks whether they are already scheduled on the **other day** of the same weekend. If the rule is enabled, **avoid** assigning both days to the same person.

---

> **Usage Note:** This guide assumes the Google Sheet and Apps Script files already exist. It is intended to help an AI agent quickly understand the system and start implementing the **Stage 7 post-processing** and **paired-weekend enforcement** enhancements.
