import json
import frappe
from frappe.model.document import Document

class MonthlyAchieved(Document):
   def before_insert(self):
        if not self.monthly_id or not self.project_id:
            return

        self.month_project_id = f"{self.monthly_id}-{self.project_id}"
@frappe.whitelist()
def get_projects_with_targets(doctype, txt, searchfield, start, page_len, filters):
    # Parse filters if it's a JSON string (which it usually is)
    if isinstance(filters, str):
        filters = json.loads(filters)

    if not filters.get('monthly_id'):
        return []

    monthly_id = filters.get('monthly_id')
    txt = f"%{txt}%" if txt else "%"

    projects = frappe.db.sql("""
        SELECT DISTINCT t.project_id
        FROM `tabchild table target` t
        JOIN `tabMonthly Target` mt ON t.parent = mt.name
        WHERE mt.name = %(monthly_id)s
          AND t.project_id LIKE %(txt)s
        ORDER BY t.project_id
        LIMIT %(limit)s OFFSET %(offset)s
    """, {
        'monthly_id': monthly_id,
        'txt': txt,
        'limit': page_len,
        'offset': start
    }, as_list=True)

    return [(p[0], p[0]) for p in projects]


@frappe.whitelist()
def get_project_details(project_id, monthly_id):
    if not project_id or not monthly_id:
        return {'total_target': 0, 'total_achieved': 0}

    result = frappe.db.sql("""
        SELECT 
            SUM(t.individual_target) AS total_target,
            SUM(t.achieved) AS total_achieved
        FROM `tabchild table target` t
        JOIN `tabMonthly Target` mt ON t.parent = mt.name
        WHERE mt.name = %(monthly_id)s
          AND t.project_id = %(project_id)s
    """, {
        'monthly_id': monthly_id,
        'project_id': project_id
    }, as_dict=True)

    if not result:
        return {'total_target': 0, 'total_achieved': 0}

    row = result[0]
    return {
        'total_target': row.total_target or 0,
        'total_achieved': row.total_achieved or 0
    }


@frappe.whitelist()
def get_individual_target(project_id, monthly_id):
    if not project_id or not monthly_id:
        return 0

    individual_target = frappe.db.sql("""
        SELECT t.individual_target
        FROM `tabchild table target` t
        JOIN `tabMonthly Target` mt ON t.parent = mt.name
        WHERE mt.name = %(monthly_id)s
          AND t.project_id = %(project_id)s
        LIMIT 1
    """, {
        'monthly_id': monthly_id,
        'project_id': project_id
    }, as_list=True)

    if individual_target and individual_target[0]:
        return individual_target[0][0] or 0
    else:
        return 0


@frappe.whitelist()
def get_sorted_months_link(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""
        SELECT
            name,
            month_name
        FROM `tabMonthly Target`
        WHERE month_name IS NOT NULL
            AND month_name LIKE %(txt)s
        ORDER BY year ASC, month_number ASC
        LIMIT %(start)s, %(page_len)s
    """, {
        "txt": f"%{txt}%",
        "start": start,
        "page_len": page_len
    })
