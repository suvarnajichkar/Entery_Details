
frappe.ui.form.on("Months Year", {
    year(frm) {
        set_month_name(frm);
    },
    month_number(frm) {
        set_month_name(frm);
    },
    before_save(frm) {
        if (!frm.doc.year || !frm.doc.month_number) return;

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Months Year",
                filters: {
                    year: frm.doc.year,
                    month_number: frm.doc.month_number,
                    name: ["!=", frm.doc.name]
                },
                limit_page_length: 1
            },
            callback(r) {
                if (r.message && r.message.length) {
                    frappe.msgprint(
                        `Record already exists for  ${frm.doc.month_name}`
                    );
                    frappe.validated = false;
                }
            }
        });
    }
});

function set_month_name(frm) {
    if (!frm.doc.year || !frm.doc.month_number) return;

    const month_map = {
        1: "January", 2: "February", 3: "March", 4: "April",
        5: "May", 6: "June", 7: "July", 8: "August",
        9: "September", 10: "October", 11: "November", 12: "December"
    };

    const month = month_map[frm.doc.month_number];
    if (!month) {
        frm.set_value("month_name", null);
        return;
    }

    frm.set_value("month_name", `${frm.doc.year}-${month}`);
}
