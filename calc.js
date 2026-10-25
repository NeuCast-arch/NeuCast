// ===== Geometry Calculator (right panel) =====
// Every shape lists: its measurements as [id, label], how to work out the area and perimeter,
// the steps to show (work), and the box the preview is drawn in (in units).
// The four category shapes take their formula text from CATEGORIES in data.js.
// The other four write their own text here.
const SHAPE_ORDER = ["circle", "square", "rectangle", "triangle", "parallelogram", "trapezoid", "pentagon", "hexagon"];

const SHAPE_MATH = {
    circle: {
        inputs: [["r", "Radius (r)"]],
        area: v => Math.PI * v.r * v.r,
        perimeter: v => 2 * Math.PI * v.r,
        areaWork: v => ["π × " + v.r + "²"],
        perimWork: v => ["2 × π × " + v.r],
        box: v => [2 * v.r, 2 * v.r]
    },
    square: {
        inputs: [["s", "Side (s)"]],
        area: v => v.s * v.s,
        perimeter: v => 4 * v.s,
        areaWork: v => [v.s + "²"],
        perimWork: v => ["4 × " + v.s],
        box: v => [v.s, v.s]
    },
    rectangle: {
        areaText: "A = l × w", perimText: "P = 2(l + w)", perimLabel: "Perimeter",
        inputs: [["l", "Length (l)"], ["w", "Width (w)"]],
        area: v => v.l * v.w,
        perimeter: v => 2 * (v.l + v.w),
        areaWork: v => [v.l + " × " + v.w],
        perimWork: v => ["2 × (" + v.l + " + " + v.w + ")"],
        box: v => [v.l, v.w]
    },
    triangle: {
        // An isosceles triangle: the two equal sides come from the base and the height
        note: "Isosceles triangle: the equal sides come from b and h.",
        inputs: [["b", "Base (b)"], ["h", "Height (h)"]],
        area: v => 0.5 * v.b * v.h,
        perimeter: v => v.b + 2 * Math.sqrt((v.b / 2) * (v.b / 2) + v.h * v.h),
        areaWork: v => ["½ × " + v.b + " × " + v.h],
        perimWork: v => [
            v.b + " + 2 × √((" + v.b + " ÷ 2)² + " + v.h + "²)",
            v.b + " + 2 × " + n2(Math.sqrt((v.b / 2) * (v.b / 2) + v.h * v.h))
        ],
        box: v => [v.b, v.h, "polygon(50% 0, 100% 100%, 0 100%)"]
    },
    parallelogram: {
        areaText: "A = b × h", perimText: "P = 2(b + s)", perimLabel: "Perimeter",
        note: "s is the slanted side. It must be at least as long as h.",
        inputs: [["b", "Base (b)"], ["h", "Height (h)"], ["s", "Slanted side (s)"]],
        check: v => v.s < v.h ? "The slanted side must be at least as long as the height." : "",
        area: v => v.b * v.h,
        perimeter: v => 2 * (v.b + v.s),
        areaWork: v => [v.b + " × " + v.h],
        perimWork: v => ["2 × (" + v.b + " + " + v.s + ")"],
        box: v => {
            const lean = Math.sqrt(v.s * v.s - v.h * v.h);
            const w = v.b + lean;
            return [w, v.h, "polygon(" + (100 * lean / w) + "% 0, 100% 0, " + (100 * v.b / w) + "% 100%, 0 100%)"];
        }
    },
    trapezoid: {
        areaText: "A = ½(a + b) × h", perimText: "P = a + b + 2c", perimLabel: "Perimeter",
        note: "Isosceles trapezoid: a is the top, b the bottom, c = √(h² + ((b − a) ÷ 2)²).",
        inputs: [["a", "Top (a)"], ["b", "Bottom (b)"], ["h", "Height (h)"]],
        area: v => 0.5 * (v.a + v.b) * v.h,
        perimeter: v => v.a + v.b + 2 * Math.sqrt(v.h * v.h + ((v.b - v.a) / 2) * ((v.b - v.a) / 2)),
        areaWork: v => ["½ × (" + v.a + " + " + v.b + ") × " + v.h],
        perimWork: v => [
            v.a + " + " + v.b + " + 2 × √(" + v.h + "² + ((" + v.b + " − " + v.a + ") ÷ 2)²)",
            v.a + " + " + v.b + " + 2 × " + n2(Math.sqrt(v.h * v.h + ((v.b - v.a) / 2) * ((v.b - v.a) / 2)))
        ],
        box: v => {
            const w = Math.max(v.a, v.b);
            const topInset = 50 * (w - v.a) / w;
            const bottomInset = 50 * (w - v.b) / w;
            return [w, v.h, "polygon(" + topInset + "% 0, " + (100 - topInset) + "% 0, " +
                (100 - bottomInset) + "% 100%, " + bottomInset + "% 100%)"];
        }
    },
    pentagon: {
        areaText: "A = ¼√(5(5 + 2√5)) × s²", perimText: "P = 5s", perimLabel: "Perimeter",
        inputs: [["s", "Side (s)"]],
        area: v => 0.25 * Math.sqrt(5 * (5 + 2 * Math.sqrt(5))) * v.s * v.s,
        perimeter: v => 5 * v.s,
        areaWork: v => ["¼ × √(5 × (5 + 2√5)) × " + v.s + "²", "1.7205 × " + n2(v.s * v.s)],
        perimWork: v => ["5 × " + v.s],
        box: v => [1.618 * v.s, 1.539 * v.s, "polygon(50% 0, 100% 38%, 81% 100%, 19% 100%, 0 38%)"]
    },
    hexagon: {
        inputs: [["s", "Side (s)"]],
        area: v => (3 * Math.sqrt(3) / 2) * v.s * v.s,
        perimeter: v => 6 * v.s,
        areaWork: v => ["(3√3 ÷ 2) × " + v.s + "²", "2.5981 × " + n2(v.s * v.s)],
        perimWork: v => ["6 × " + v.s],
        box: v => [2 * v.s, Math.sqrt(3) * v.s, "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)"]
    }
};

// 78.5398 becomes 78.54, and 12.00 becomes 12
function n2(x) {
    return Number(x.toFixed(2));
}

// The category that uses this shape, or "" for the extra shapes
function categoryOfShape(shape) {
    for (let i = 0; i < categoryKeys.length; i++) {
        if (CATEGORIES[categoryKeys[i]].shape === shape) return categoryKeys[i];
    }
    return "";
}

// The colour class for a shape: its category colour, or its own colour (k-name)
function shapeColor(shape) {
    const key = categoryOfShape(shape);
    return key === "" ? "k-" + shape : "c-" + key;
}

// Formula text for a shape
function formulaOf(shape) {
    const key = categoryOfShape(shape);
    if (key !== "") {
        const c = CATEGORIES[key];
        return { area: c.area, perim: c.perimeter, label: c.perimeterLabel };
    }
    const m = SHAPE_MATH[shape];
    return { area: m.areaText, perim: m.perimText, label: m.perimLabel };
}

let calcShape = "circle";   // the shape chosen in the calculator
let calcValues = {};        // what is typed in the boxes, like { r: "5" }

const calcShapes = document.getElementById("calcShapes");
const calcInputs = document.getElementById("calcInputs");
const calcPreview = document.getElementById("calcPreview");
const calcSteps = document.getElementById("calcSteps");

// One button for each shape
function renderCalcShapes() {
    let html = "";
    for (let i = 0; i < SHAPE_ORDER.length; i++) {
        const shape = SHAPE_ORDER[i];
        let classes = "calc-shape " + shapeColor(shape);
        if (shape === calcShape) classes += " active";

        html += '<button type="button" class="' + classes + '" data-shape="' + shape + '" aria-pressed="' + (shape === calcShape) + '">' +
            '<span class="shape sm ' + shape + '"></span>' + capitalize(shape) + "</button>";
    }
    calcShapes.innerHTML = html;
}

// One number box for each measurement the chosen shape needs
function renderCalcInputs() {
    const math = SHAPE_MATH[calcShape];
    let html = "";

    for (let i = 0; i < math.inputs.length; i++) {
        const id = math.inputs[i][0];
        if (calcValues[id] === undefined) calcValues[id] = "5";

        html += '<label>' + math.inputs[i][1] +
            '<input type="number" min="0" step="any" data-id="' + id + '" value="' + calcValues[id] + '"></label>';
    }
    calcInputs.innerHTML = html;
}

// Shows one calculation, line by line: formula, then each step of working, then the answer
function stepsHtml(title, formula, work, answer) {
    let html = '<div class="step-block"><b>' + title + "</b><code>" + escapeHtml(formula) + "</code>";
    for (let i = 0; i < work.length; i++) {
        html += "<code>= " + escapeHtml(work[i]) + "</code>";
    }
    return html + "<code><strong>= " + answer + "</strong></code></div>";
}

// Works out the answers, the steps, and redraws the preview shape
function updateCalc() {
    const math = SHAPE_MATH[calcShape];
    const text = formulaOf(calcShape);
    const values = {};
    let valid = true;

    for (let i = 0; i < math.inputs.length; i++) {
        const id = math.inputs[i][0];
        values[id] = parseFloat(calcValues[id]);
        if (isNaN(values[id]) || values[id] <= 0) valid = false;
    }

    // Some shapes cannot exist with certain numbers
    let problem = "";
    if (valid && math.check) problem = math.check(values);

    document.getElementById("calcPerimLabel").textContent = text.label + " (" + text.perim.charAt(0) + ")";
    document.getElementById("calcFormula").innerHTML =
        escapeHtml(text.area) + " &nbsp;|&nbsp; " + escapeHtml(text.perim) +
        (math.note ? "<br><small>" + escapeHtml(math.note) + "</small>" : "");

    if (!valid || problem !== "") {
        document.getElementById("calcArea").textContent = "-";
        document.getElementById("calcPerim").textContent = "-";
        calcPreview.innerHTML = "";
        calcSteps.innerHTML = '<p class="step-note">' + (problem !== "" ? problem : "Type a number bigger than 0 in every box.") + "</p>";
        return;
    }

    const area = math.area(values).toFixed(2) + " units²";
    const perimeter = math.perimeter(values).toFixed(2) + " units";
    document.getElementById("calcArea").textContent = area;
    document.getElementById("calcPerim").textContent = perimeter;

    calcSteps.innerHTML =
        stepsHtml("Area", text.area, math.areaWork(values), area) +
        stepsHtml(text.label, text.perim, math.perimWork(values), perimeter);

    // The preview is a sketch of the shape. It grows with the numbers (between 16 and 100 pixels).
    const box = math.box(values);
    const biggest = Math.max(box[0], box[1]);
    let scale = Math.min(10, 100 / biggest);
    if (biggest * scale < 16) scale = 16 / biggest;

    let style = "width:" + box[0] * scale + "px;height:" + box[1] * scale + "px;";
    if (box[2]) style += "clip-path:" + box[2] + ";";

    calcPreview.className = "calc-preview " + shapeColor(calcShape);
    calcPreview.innerHTML = '<span class="shape ' + calcShape + '" style="' + style + '"></span>';
}

calcShapes.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    calcShape = button.dataset.shape;
    calcValues = {};
    renderCalcShapes();
    const again = calcShapes.querySelector('[data-shape="' + calcShape + '"]');
    if (again) again.focus();
    renderCalcInputs();
    updateCalc();
});

calcInputs.addEventListener("input", function (event) {
    calcValues[event.target.dataset.id] = event.target.value;
    updateCalc();
});

// Start
renderCalcShapes();
renderCalcInputs();
updateCalc();
