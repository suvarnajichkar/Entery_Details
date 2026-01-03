

import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Month", "fieldname": "month", "fieldtype": "Data", "width": 150},
        {"label": "Project Id", "fieldname": "project_id", "fieldtype": "Data", "width": 150},
        {"label": "Target", "fieldname": "target", "fieldtype": "Float", "width": 140},
        {"label": "Achieved", "fieldname": "achieved", "fieldtype": "Float", "width": 140},
        {"label": "Balance", "fieldname": "balance", "fieldtype": "Float", "width": 140},
        {"label": "Percentage", "fieldname": "percentage", "fieldtype": "Data", "width": 110},
    ]

    if not filters.get("month"):
        return columns, []

    data = frappe.db.sql("""
        SELECT
            monthly_id AS month,
            project_id,
            MAX(COALESCE(individual_target, 0)) AS target,
            SUM(achived) AS achieved,
            MAX(COALESCE(individual_target, 0)) - SUM(achived) AS balance
        FROM `tabMonthly Achieved`
        WHERE monthly_id = %s
        GROUP BY monthly_id, project_id
        ORDER BY project_id
    """, (filters.get("month"),), as_dict=True)

    total_target = 0
    total_achieved = 0

    for row in data:
        target = row.get("target") or 0
        achived = row.get("achieved") or 0

        total_target += target
        total_achieved += achived

        percent = (achived / target * 100) if target else 0
        row["percentage"] = f"{round(percent, 2)} %"

    total_balance = total_target - total_achieved

    data.append({
        "month": "Total",
        "target": total_target,
        "achieved": total_achieved,
        "balance": total_balance,
        "percentage": ""
    })

    return columns, data


@frappe.whitelist()
def get_month_total_target(month):
    result = frappe.db.sql("""
        SELECT total_month_target
        FROM `tabMonthly Target`
        WHERE name LIKE %s
    """, (f"%{month}%",), as_list=True)

    return result[0][0] if result else 0


@frappe.whitelist()
def get_month_total_achieved(month):
    result = frappe.db.sql("""
        SELECT
            SUM(achived)
        FROM `tabMonthly Achieved`
        WHERE monthly_id LIKE %s
    """, (f"%{month}%",), as_list=True)

    return result[0][0] or 0
