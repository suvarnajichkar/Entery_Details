

frappe.query_reports["Monthly Report"] = {
    filters: [
        {
            fieldname: "month",
            label: "Month",
            fieldtype: "Select",
            options: [],
            on_change: function () {
                let month = frappe.query_report.get_filter_value("month");

                $("#sum_target").text("--");
                $("#sum_achieved").text("--");
                $("#sum_balance").text("--");
                $("#sum_percentage").text("--");

                if (!month) return;

                frappe.query_report.refresh();

                let totalTarget = 0;
                let totalAchieved = 0;

                frappe.call({
                    method: "info_app.info_app.report.monthly_report.monthly_report.get_month_total_target",
                    args: { month },
                    callback: function (r) {
                        totalTarget = parseFloat(r.message) || 0;
                        $("#sum_target").text(totalTarget);
                        updateCards();
                    }
                });

                frappe.call({
                    method: "info_app.info_app.report.monthly_report.monthly_report.get_month_total_achieved",
                    args: { month },
                    callback: function (r) {
                        totalAchieved = parseFloat(r.message) || 0;
                        $("#sum_achieved").text(totalAchieved);
                        updateCards();
                    }
                });

                function updateCards() {
                    let balance = totalTarget - totalAchieved;
                    let percent = totalTarget
                        ? ((totalAchieved / totalTarget) * 100).toFixed(2)
                        : "0.00";

                    $("#sum_balance").text(balance);
                    $("#sum_percentage").text(`${percent}%`);
                }
            }
        }
    ],

    onload: function (report) {

        setTimeout(() => {
            report.page.page_form.find('[data-fieldname="month"]').hide();
        }, 300);

        if (!document.getElementById("monthly_container")) {
            report.page.main.prepend(`
                <div id="monthly_container">
                    <div class="month-top">
                        <label>Month</label>
                        <select id="month_top_select" class="form-control">
                            <option value="">Select Month</option>
                        </select>
                    </div>

                    <div class="project-summary">
                        <div class="summary-card">
                            <div class="label">Total Month Target</div>
                            <div class="value" id="sum_target">--</div>
                        </div>
                        <div class="summary-card">
                            <div class="label">Total Achieved</div>
                            <div class="value green" id="sum_achieved">--</div>
                        </div>
                        <div class="summary-card">
                            <div class="label">Balance</div>
                            <div class="value" id="sum_balance">--</div>
                        </div>
                        <div class="summary-card">
                            <div class="label">Percentage Achieved</div>
                            <div class="value blue" id="sum_percentage">--</div>
                        </div>
                    </div>
                </div>
            `);
        }

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Monthly Achieved",
                fields: ["monthly_id"],
                limit_page_length: 1000
            },
            callback: function (r) {
                if (!r.message) return;

                const monthMap = {
                    January: 1, February: 2, March: 3, April: 4,
                    May: 5, June: 6, July: 7, August: 8,
                    September: 9, October: 10, November: 11, December: 12
                };

                let months = r.message
                    .map(d => d.monthly_id)
                    .filter(Boolean)
                    .map(m => {
                        let [year, monthName] = m.split("-");
                        return {
                            label: m,
                            year: parseInt(year),
                            month: monthMap[monthName]
                        };
                    })
                    .filter(m => m.year && m.month)
                    .sort((a, b) =>
                        a.year !== b.year
                            ? a.year - b.year
                            : a.month - b.month
                    )
                    .map(m => m.label);

                months = [...new Set(months)];

                let month_filter = frappe.query_report.get_filter("month");
                month_filter.df.options = ["", ...months];
                month_filter.refresh();

                let select = $("#month_top_select");
                select.empty().append(`<option value="">Select Month</option>`);

                months.forEach(m => {
                    select.append(`<option value="${m}">${m}</option>`);
                });

                select.on("change", function () {
                    frappe.query_report.set_filter_value("month", this.value);
            
                });
            }
        });
        
    }
};

// ---- STYLES ----
$(`<style>
.month-top {
    max-width: 220px;
    margin-bottom: 16px;
}
.month-top label {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
    display: block;
}
.project-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;
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
}
.summary-card .value.green {
    color: #16a34a;
}
.summary-card .value.blue {
    color: #2563eb;
}
</style>`).appendTo("head");
