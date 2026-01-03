# # Copyright (c) 2025, sj and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from calendar import month_name

class MonthlyTarget(Document):

    def validate(self):
        self.validate_total_target()
        self.validate_duplicate_project()

    def validate_total_target(self):
        total_month_target = self.total_month_target or 0
        total_individual = 0

        for row in self.child_table_target:
            total_individual += row.individual_target or 0

        if total_individual > total_month_target:
            excess = total_individual - total_month_target

            frappe.msgprint(
                f"""
                <div style="font-size:14px; padding:6px; line-height:1.6;">
                    The total of <b>Individual Targets</b> exceeds the
                    <b>Total Month Target</b>.<br><br>

                    <b>Total Month Target:</b> {total_month_target}<br>
                    <b>Current Total:</b> {total_individual}<br>
                    <b>Excess Amount:</b> {excess}<br><br>

                    Please reduce the individual targets by
                    <b>{excess}</b> so the total becomes exactly
                    <b>{total_month_target}</b>.
                </div>
                """,
                title="Monthly Target Limit Exceeded",
                indicator="red",
                raise_exception=True
            )

    def validate_duplicate_project(self):
        seen = set()
        duplicates = set()

        for row in self.child_table_target:
            if not row.project_id:
                continue

            if row.project_id in seen:
                duplicates.add(row.project_id)
            else:
                seen.add(row.project_id)

        if duplicates:
            dup_list = ", ".join(duplicates)

            frappe.msgprint(
                f"""
                <div style="font-size:14px; padding:6px; line-height:1.6;">
                    The following <b>Project ID(s)</b> are repeated in the
                    child table:<br><br>

                    <b>{dup_list}</b><br><br>

                    Each Project ID is allowed only once per Monthly Target.
                    Please remove the duplicates before saving.
                </div>
                """,
                title="Duplicate Project ID",
                indicator="red",
                raise_exception=True
            )


@frappe.whitelist()
def get_sorted_months_link(doctype, txt, searchfield, start, page_len, filters):
    """
    Return Month Name options sorted by year and month_number
    from Months Year, only returning the month name itself.
    """
    months = frappe.get_all(
        "Months Year",
        filters={"month_name": ["!=", ""]},  # only valid months
        fields=["month_name", "year", "month_number"],
        order_by="year ASC, month_number ASC",
        limit_start=start,
        limit_page_length=page_len
    )

    # Return as list of tuples for Link field: (month_name, month_name)
    return [(m["month_name"], m["month_name"]) for m in months]

