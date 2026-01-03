// Copyright (c) 2025, sj and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Monthly Achieved", {
// 	refresh(frm) {

// 	},
// });

frappe.ui.form.on("Monthly Achieved", {
    onload(frm) {
        frm.set_query("monthly_id", () => {
            return {
                query: "info_app.info_app.doctype.monthly_achieved.monthly_achieved.get_sorted_months_link"
            };
        });
    }
});


frappe.ui.form.on('Monthly Achieved', {
    before_save: async function (frm) {
        if (!frm.doc.monthly_id || !frm.doc.project_id) return;

        let individual_target = frm.doc.individual_target || 0;
        let current_achieved = frm.doc.achived || 0;

        // Fetch achieved earlier (excluding current doc)
        let existing_records = await frappe.db.get_list("Monthly Achieved", {
            filters: {
                monthly_id: frm.doc.monthly_id,
                project_id: frm.doc.project_id,
                name: ["!=", frm.doc.name]
            },
            fields: ["achived"]
        });

        let achieved_earlier = existing_records.reduce(
            (sum, r) => sum + (r.achived || 0),
            0
        );

        let remaining = individual_target - achieved_earlier;
        let total_after_entry = achieved_earlier + current_achieved;

        if (total_after_entry > individual_target) {
            frappe.msgprint({
                title: "Target Limit Exceeded",
                message: `
                    <div style="font-size:14px; line-height:1.6;">
                        <b>Individual Target:</b> ${individual_target} KG<br>
                        <b>Achieved Earlier:</b> ${achieved_earlier} KG<br>
                        <b>Remaining:</b> ${remaining} KG<br><br>

                        <b>You Entered:</b> ${current_achieved} KG<br><br>

                        This entry exceeds the remaining target.
                        Please enter a value ≤ ${remaining} KG.
                    </div>
                `,
                indicator: "red"
            });

            frm.set_value('achived', 0);
            frappe.validated = false;
            throw "Validation failed";
        }
    }
});



frappe.ui.form.on("Monthly Achieved", {
    onload(frm) {
        set_project_filter(frm);
    },

    monthly_id(frm) {
        frm.set_value("project_id", null);
        set_project_filter(frm);
    },

    project_id(frm) {
        if (!frm.doc.project_id || !frm.doc.monthly_id) {
            frm.set_value("individual_target", 0);
            return;
        }

        frappe.call({
            method: "info_app.info_app.doctype.monthly_achieved.monthly_achieved.get_individual_target",
            args: {
                project_id: frm.doc.project_id,
                monthly_id: frm.doc.monthly_id
            },
            callback: function (r) {
                if (r.message !== undefined) {
                    frm.set_value("individual_target", r.message);
                } else {
                    frm.set_value("individual_target", 0);
                }
            }
        });
    }
});

function set_project_filter(frm) {
    frm.set_query("project_id", function () {
        if (!frm.doc.monthly_id) {
            return { filters: { name: ["in", []] } };
        }
        return {
            query: "info_app.info_app.doctype.monthly_achieved.monthly_achieved.get_projects_with_targets",
            filters: { monthly_id: frm.doc.monthly_id }
        };
    });
}

// for validation purpose

frappe.ui.form.on("Monthly Achieved", {
    validate(frm) {
        if (!frm.doc.monthly_id || !frm.doc.achived) {
            return;
        }

        frappe.db.get_list("Monthly Achieved", {
            filters: {
                monthly_id: frm.doc.monthly_id,
                name: ["!=", frm.doc.name]
            },
            fields: ["achived"]
        }).then(records => {

            let total_achieved = 0;

            records.forEach(r => {
                total_achieved += r.achived || 0;
            });

            total_achieved += frm.doc.achived || 0;

            let monthly_target = frm.doc.total_month_target || 1000;

            if (total_achieved > monthly_target) {

                let remaining = monthly_target - (total_achieved - frm.doc.achived);

                frappe.msgprint({
                    title: "Target Exceeded",
                    indicator: "red",
                    message: `
                        <b>Monthly Target:</b> ${monthly_target}<br>
                        <b>Achieved Earlier:</b> ${total_achieved - frm.doc.achived}<br>
                        <b>Remaining:</b> ${remaining}<br><br>
                        <b>You Entered:</b> ${frm.doc.achived}<br><br>
                    `
                });

                frappe.validated = false;
            }
        });
    }
});





