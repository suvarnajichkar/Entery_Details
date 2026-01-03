// -----------------------------------------
// PART 1: Load Earnings & Deductions
// -----------------------------------------

frappe.ui.form.on("Salary Structure Assignment", {

    salary_structure(frm) {
        if (!frm.doc.salary_structure) return;

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Salary Structure",
                name: frm.doc.salary_structure
            },

            callback: async function (r) {
                if (!r.message) return;

                let ss = r.message;

                frm.clear_table("custom_earnings");
                frm.clear_table("custom_deductions");

                for (let e of (ss.earnings || [])) {
                    let row = frm.add_child("custom_earnings");
                    row.salary_component = e.salary_component;
                    row.abbr = e.abbr || "";

                    let res = await frappe.db.get_value(
                        "Salary Component",
                        e.salary_component,
                        ["formula"]
                    );

                    row.formula = res?.message?.formula || "";
                }

                for (let d of (ss.deductions || [])) {
                    let row = frm.add_child("custom_deductions");
                    row.salary_component = d.salary_component;
                    row.abbr = d.abbr || "";

                    let res = await frappe.db.get_value(
                        "Salary Component",
                        d.salary_component,
                        ["formula"]
                    );

                    row.formula = res?.message?.formula || "";
                }

                frm.refresh_field("custom_earnings");
                frm.refresh_field("custom_deductions");

                calculate_all_components(frm);
            }
        });
    },

    base(frm) {
        calculate_all_components(frm);
    }
});


// -----------------------------------------
// PART 2: Auto-Calculation Engine
// -----------------------------------------

async function calculate_all_components(frm) {

    let base = frm.doc.base || 0;

    let vars = { base };

    
    frm.doc.custom_earnings.forEach(r => vars[r.abbr] = 0);
    frm.doc.custom_deductions.forEach(r => vars[r.abbr] = 0);

    let calc_order = ["B", "DA", "HRA", "GP", "PF", "ESIC", "PT"];

    for (let abbr of calc_order) {

        let row =
            frm.doc.custom_earnings.find(r => r.abbr === abbr) ||
            frm.doc.custom_deductions.find(r => r.abbr === abbr);

        if (!row || !row.formula) continue;

        try {
            let value = safe_evaluate_formula(row.formula, vars);
            row.amount = value;
            vars[abbr] = value;
        }
        catch (err) {
            console.log("Formula error in", abbr, err);
        }
    }
    
    for (let pass = 1; pass <= 5; pass++) {

        // Earnings recalculation
        frm.doc.custom_earnings.forEach(row => {

            if (!row.formula || row.__manual) return;

            let val = safe_evaluate_formula(row.formula, vars);
            row.amount = val;
            vars[row.abbr] = val;
        });

        // Deductions recalculation
        frm.doc.custom_deductions.forEach(row => {

            // PT special rule
            if (row.abbr === "PT" && frm.doc.from_date) {
                let date = frappe.datetime.str_to_obj(frm.doc.from_date);
                let m = date.getMonth() + 1;
                row.amount = (m === 3 ? 300 : 200);
                vars[row.abbr] = row.amount;
                return;
            }

            if (!row.formula || row.__manual) return;

            let val = safe_evaluate_formula(row.formula, vars);
            row.amount = val;
            vars[row.abbr] = val;
        });
    }


    frm.refresh_field("custom_earnings");
    frm.refresh_field("custom_deductions");
}


// -----------------------------------------
// PART 3: Python IF/ELSE Conversion
// -----------------------------------------

function convert_python_if(expr) {
    expr = expr.trim();

    let regex = /([^?]+?)\s+if\s+([^:]+?)\s+else\s+(.+)/;

    let safety = 0;
    while (regex.test(expr) && safety < 50) {
        expr = expr.replace(regex, function(_, t, c, f) {
            t = t.trim();
            c = c.trim();
            f = f.trim();
            return `(${c}) ? (${t}) : (${f})`;
        });
        safety++;
    }

    return expr;
}



// -----------------------------------------
// PART 4: Safe Evaluation
// -----------------------------------------

function safe_evaluate_formula(formula, vars) {

    let exp = formula
        .replace(/\band\b/g, "&&")
        .replace(/\bor\b/g, "||")
        .replace(/\bnot\b/g, "!")
        .trim();

    console.log("Formula RAW:", formula);

    exp = convert_python_if(exp);

    for (let key in vars) {
        let pattern = new RegExp("\\b" + key + "\\b", "g");
        exp = exp.replace(pattern, vars[key]);
    }

    console.log("Final Expression:", exp);
    console.log("VARS:", vars);

    if (!/^[0-9+\-*/().<>=!?&| \s?:,]+$/.test(exp)) {
        throw "Invalid formula: " + exp;
    }

    return Function('"use strict"; return (' + exp + ')')();
}
