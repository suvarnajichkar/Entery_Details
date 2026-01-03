
frappe.ui.form.on("Monthly Target", {
    onload: function(frm) {
        frm.set_query("month_name", function() {
            return {
                query: "info_app.info_app.doctype.monthly_target.monthly_target.get_sorted_months_link"
            };
        });
    }
});
frappe.ui.form.on("Monthly Target", {
    month_name(frm) {
        if (!frm.doc.month_name) {
            frm.set_value("month_number", "");
            return;
        }

        const month_map = {
            January: 1,
            February: 2,
            March: 3,
            April: 4,
            May: 5,
            June: 6,
            July: 7,
            August: 8,
            September: 9,
            October: 10,
            November: 11,
            December: 12
        };

        // Expected format: YYYY-MonthName
        const parts = frm.doc.month_name.split("-");
        if (parts.length !== 2) {
            frm.set_value("month_number", "");
            return;
        }

        const month_name = parts[1];
        frm.set_value("month_number", month_map[month_name] || "");
    }
});





frappe.ui.form.on("Monthly Target", {
    validate(frm) {
        let projects = new Set();
        let duplicates = new Set();

        (frm.doc.child_table_target || []).forEach(row => {
            if (!row.project_id) return;

            if (projects.has(row.project_id)) {
                duplicates.add(row.project_id);
            } else {
                projects.add(row.project_id);
            }
        });

        if (duplicates.size > 0) {
            frappe.msgprint({
                title: "Duplicate Project ID",
                message: `
                    <div style="font-size:14px; padding:6px; line-height:1.6;">
                        The following <b>Project ID(s)</b> are duplicated in the
                        child table:<br><br>

                        <b>${[...duplicates].join(", ")}</b><br><br>

                        Each Project ID must be unique.
                    </div>
                `,
                indicator: "red"
            });

            frappe.validated = false;
            return;
        }
    }
});
