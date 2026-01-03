// // Copyright (c) 2025, sj and contributors
// For license information, please see license.txt

frappe.query_reports["Projectid Report"] = {
    filters: [
        {
            fieldname: "project_id",
            label: "Project Prefix",
            fieldtype: "Select",
            reqd: 1,
            on_change: function () {
                let prefix = frappe.query_report.get_filter_value("project_id");

                if (!prefix) {
                    frappe.query_report.set_filter_value("start_date", "");
                    frappe.query_report.set_filter_value("total_tonnage", "");
                    frappe.query_report.set_filter_value("total_balance", "");
                    clear_month_details_container();
                    return;
                }

                frappe.call({
                    method: "frappe.client.get",
                    args: {
                        doctype: "Projects",
                        name: prefix
                    },
                    callback: function (r) {
                        if (r.message) {
                            frappe.query_report.set_filter_value("start_date", `Start Date      ${r.message.start_date}`);
                            frappe.query_report.set_filter_value("total_tonnage", `Total Tonnage    ${r.message.total_tonnage}`);

                            calculate_total_balance(prefix, r.message.total_tonnage);

                            clear_month_details_container();
                        }
                    }
                });
            }
        },
        {
            fieldname: "start_date",
            label: "Start Date",
            fieldtype: "Data",
            read_only: 1
        },
        {
            fieldname: "total_tonnage",
            label: "Total Tonnage",
            fieldtype: "Data",
            read_only: 1
        },
        {
            fieldname: "total_balance",
            label: "Total Balance",
            fieldtype: "Data",
            read_only: 1
        },
    ],

    onload: function (report) {
        // ---------- SUMMARY UI (UI ONLY) ----------
        if (!document.getElementById("project_summary_cards")) {
            let html = `
        <div id="project_summary_cards" class="project-summary">
            <div class="summary-card">
                <div class="label">Total Target Tonnage</div>
                <div class="value" id="sum_target">--</div>
            </div>
            <div class="summary-card">
                <div class="label">Total Achived</div>
                <div class="value green" id="sum_achived">--</div>
            </div>
            <div class="summary-card">
                <div class="label">Balance</div>
                <div class="value" id="sum_balance">--</div>
            </div>
            <div class="summary-card">
                <div class="label">Percent Achived</div>
                <div class="value blue" id="sum_percent">--</div>
            </div>
        </div>
    `;
            report.page.main.prepend(html);
        }

        // Populate project_id options
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Monthly Achieved",
                fields: ["project_id"],
                distinct: 1,
                limit_page_length: 1000
            },
            callback: function (r) {
                if (!r.message) return;

                let projects = [];

                r.message.forEach(d => {
                    if (d.project_id && !projects.includes(d.project_id)) {
                        projects.push(d.project_id);
                    }
                });

                // SORT BY NUMBER AFTER DASH
                projects.sort((a, b) => {
                    let numA = parseInt(a.split("-")[1], 10);
                    let numB = parseInt(b.split("-")[1], 10);
                    return numA - numB;
                });

                let prefix_filter = report.get_filter("project_id");
                prefix_filter.df.options = projects.join("\n");
                prefix_filter.refresh();

            }
        });

        // Create the container div for month details if not already present
        if (!document.getElementById("month_details_container")) {
            let container = document.createElement("div");
            container.id = "month_details_container";
            container.style.marginTop = "20px";
            container.style.backgroundColor = "#fff";
            container.style.padding = "10px";
            container.style.border = "1px solid #ccc";

            // Append below filters section or main report container
            // Adjust selector based on your page layout
            let parent = document.querySelector(".page-content") || document.body;
            parent.appendChild(container);
        }
        report.filters.forEach(f => {
            if (f.df.fieldname !== "project_id") {
                f.$wrapper.hide();
            }
        });

        // Move project_id filter to top (above summary cards)
        let prefix_filter = report.get_filter("project_id");
        if (prefix_filter && prefix_filter.$wrapper) {
            prefix_filter.$wrapper.prependTo(report.page.main);
        }
    }
};

// Helper function to clear month details container
function clear_month_details_container() {
    let container = document.getElementById("month_details_container");
    if (container) {
        container.innerHTML = "";
    }
}

// Above calculation of total balance for project summary cards
function calculate_total_balance(prefix, total_tonnage) {
    console.log("calculate_total_balance called", prefix, total_tonnage);

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Monthly Achieved",
            fields: ["name", "monthly_id", "achived"],
            filters: { project_id: prefix },
            limit_page_length: 1000
        },
        callback: function (r) {
            console.log("Monthly Achieved response:", r.message);

            let total_achived_sum = 0;

            if (Array.isArray(r.message)) {
                r.message.forEach(d => {
                    total_achived_sum += Number(d.achived) || 0;
                });
            }

            let target = Number(total_tonnage) || 0;
            let balance = target - total_achived_sum;
            let percent = target ? ((total_achived_sum / target) * 100).toFixed(1) : 0;

            $("#sum_target").text(target);
            $("#sum_achived").text(total_achived_sum);
            $("#sum_balance").text(balance);
            $("#sum_percent").text(percent + " %");

            frappe.query_report.set_filter_value(
                "total_balance",
                `Total Balance      ${balance}`
            );
        }
    });
}

// -------------------------
// CLICKABLE MONTH FORMATTER
// -------------------------


frappe.query_reports["Projectid Report"].formatter = function (
    value,
    row,
    column,
    data,
    default_formatter
) {
    if (column.fieldname === "view") {

        if (!data || !data.monthly_id) {
            return "";
        }

        if (data.month && data.month.toUpperCase() === "TOTAL") {
            return "";
        }

        let prefix = frappe.query_report.get_filter_value("project_id");
        let monthly_id = data.monthly_id;  // pass the exact monthly_id, e.g. "2025-January"

        return `
            <button class="btn btn-xs btn-primary"
                onclick="show_month_details_inline('${prefix}', '${monthly_id}')">
                View
            </button>
        `;
    }

    return default_formatter(value, row, column, data);
};


// -------------------------
// INLINE MONTH DETAILS WITH SUMMARY
// -------------------------

window.show_month_details_inline = function (prefix, month) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Monthly Achieved",
            fields: ["monthly_id", "date", "individual_target", "achived","target_process","invoice_number","attach"],
            filters: {
                project_id: prefix,
                monthly_id: month
            },
            limit_page_length: 500
        },
        callback: function (r) {
            if (!r.message || r.message.length === 0) {
                document.getElementById("month_details_container").innerHTML =
                    `<p>No data found for ${month}.</p>`;
                return;
            }

            let rows = r.message.map(d => {
                let bal = (d.individual_target || 0) - (d.achived || 0);
                return `
                    <tr>
                        <td>${d.monthly_id}</td>
                        <td>${d.date}</td>
                        <td>${d.individual_target}</td>
                        <td>${d.achived}</td>
                        <td>${bal}</td>
                        <td>${d.target_process}</td>
                        <td>${d.invoice_number || ""}</td>
                        <td>${d.attach ? `<a href="${frappe.urllib.get_full_url(d.attach)}" target="_blank">View</a>` : ''}</td>

                    </tr>
                `;
            }).join("");

            document.getElementById("month_details_container").innerHTML = `
                <h3>${month.toUpperCase()} Details</h3>
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Monthly ID</th>
                            <th>Date</th>
                            <th>Individual Target</th>
                            <th>Achieved</th>
                            <th>Balance</th>
                            <th>Target Process</th>
                            <th>Invoice Number</th>
                            <th>Attachment</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }
    });
};

$(`<style>
.layout-main-section.frappe-card{
    padding: 20px;
}
.project-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin: 20px 0;
}

.summary-card {
    background: #fff;
    border-radius: 10px;
    padding: 18px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    text-align: center;
}

.summary-card .label {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 6px;
}

.summary-card .value {
    font-size: 22px;
    font-weight: 600;
    color: #111827;
}

.summary-card .value.green {
    color: #16a34a;
}

.summary-card .value.blue {
    color: #2563eb;
}
</style>`).appendTo("head");
