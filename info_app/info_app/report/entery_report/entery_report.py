# Copyright (c) 2025, sj and contributors
# For license information, please see license.txt

# import frappe


# def execute(filters=None):
# 	columns, data = [], []
# 	return columns, data


import frappe

def execute(filters=None):
    if not filters:
        filters = {}

    columns = [
        {"label": "ID", "fieldname": "id", "fieldtype": "Data", "width": 120},
        {"label": "Date", "fieldname": "date", "fieldtype": "Date", "width": 120},
        {"label": "Time", "fieldname": "time", "fieldtype": "Data", "width": 100},
        {"label": "Vender", "fieldname": "vender", "fieldtype": "Data", "width": 150},
        {"label": "Receiver Information", "fieldname": "receiver", "fieldtype": "Data", "width": 200},
    ]

    # filters
    conditions = ""
    if filters.get("from_date"):
        conditions += " AND date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND date <= %(to_date)s"
    if filters.get("vender"):
        conditions += " AND vender = %(vender)s"

    # query
    data = frappe.db.sql(f"""
        SELECT
            name AS id,     -- This fetches the auto-generated ID (like 24-25-0007)
            date,
            time,
            vender,
            receiver
        FROM
            `tabGet Entery`
        WHERE
            1=1 {conditions}
        ORDER BY
            date DESC
    """, filters, as_dict=1)

    return columns, data