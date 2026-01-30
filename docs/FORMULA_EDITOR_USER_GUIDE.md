# Formula Editor User Guide

**NutriVault - Calculated Measures**
**Version:** 1.0
**Last Updated:** 2026-01-24
**Audience:** System Administrators

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Formula Basics](#formula-basics)
4. [Formula Syntax](#formula-syntax)
5. [Cross-Measure Formulas](#cross-measure-formulas)
6. [Time-Series Formulas](#time-series-formulas)
7. [Using Templates](#using-templates)
8. [Testing Formulas](#testing-formulas)
9. [Common Examples](#common-examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

The Formula Editor allows you to create **calculated measures** that automatically compute values based on other measures. This powerful feature enables you to:

- Calculate Body Mass Index (BMI) from weight and height
- Track weight changes over time
- Compute mean arterial pressure from blood pressure readings
- Create custom health metrics without manual calculation

### What are Calculated Measures?

Calculated measures are special measures that:
- **Auto-calculate** when their dependencies are logged
- **Update automatically** when source values change
- Are **read-only** in patient records (can't be edited manually)
- Support both **cross-measure** (e.g., BMI) and **time-series** (e.g., weight change) calculations

---

## Getting Started

### Prerequisites

- **Role:** Administrator access required
- **Knowledge:** Basic understanding of mathematical formulas
- **Setup:** Source measures must exist before creating calculated measures

### Creating Your First Calculated Measure

1. Navigate to **Measures** page
2. Click **"Create Measure Definition"**
3. Fill in basic information:
   - **Category:** Select appropriate category (e.g., Anthropometric)
   - **Measure Type:** Select **"Calculated"**
   - **Name:** Internal ID (e.g., `bmi`)
   - **Display Name:** User-facing name (e.g., `Body Mass Index`)
   - **Unit:** Result unit (e.g., `kg/m²`)
   - **Decimal Places:** Number of decimals (default: 2)

4. In the **Formula Configuration** section:
   - Enter your formula manually **OR**
   - Click **"📋 Templates"** to use a pre-built formula

5. **Validate** the formula (happens automatically)
6. **Preview** with sample values (optional but recommended)
7. Click **"Create Measure"**

---

## Formula Basics

### Structure

A formula consists of:
- **Variables:** Measure names wrapped in curly braces `{measure_name}`
- **Operators:** Mathematical operations `+`, `-`, `*`, `/`, `^`
- **Functions:** Built-in functions like `sqrt()`, `abs()`, `min()`, `max()`

### Example: Simple Formula

```
{weight} / ({height} * {height})
```

This calculates BMI by dividing weight by height squared.

### How Formulas Work

1. **You create** a calculated measure with a formula
2. **User logs** source measures (e.g., weight and height)
3. **System automatically:**
   - Detects the logged measures
   - Finds dependent calculated measures
   - Evaluates formulas
   - Stores calculated results
4. **Calculated value** appears in patient record with 🧮 badge

---

## Formula Syntax

### Variables

Reference other measures by name in curly braces:

```
{measure_name}
```

**Rules:**
- Use the measure's **internal name** (not display name)
- Names are **case-sensitive**
- Must use **lowercase** with **underscores** (e.g., `blood_pressure_systolic`)

**Example:**
```
{weight} + {height}
```

### Operators

| Operator | Operation | Example | Result |
|----------|-----------|---------|--------|
| `+` | Addition | `{a} + {b}` | Sum |
| `-` | Subtraction | `{a} - {b}` | Difference |
| `*` | Multiplication | `{a} * {b}` | Product |
| `/` | Division | `{a} / {b}` | Quotient |
| `^` | Exponentiation | `{a} ^ 2` | a squared |

**Order of Operations:**
- Parentheses first: `()`
- Exponents: `^`
- Multiplication/Division: `*` `/`
- Addition/Subtraction: `+` `-`

**Example:**
```
({weight} - {ideal_weight}) / {ideal_weight} * 100
```

### Functions

Built-in mathematical functions:

| Function | Description | Example |
|----------|-------------|---------|
| `sqrt(x)` | Square root | `sqrt({height})` |
| `abs(x)` | Absolute value | `abs({weight_change})` |
| `round(x, decimals)` | Round to decimals | `round({bmi}, 1)` |
| `floor(x)` | Round down | `floor({age})` |
| `ceil(x)` | Round up | `ceil({dosage})` |
| `min(x, y, ...)` | Minimum value | `min({bp1}, {bp2})` |
| `max(x, y, ...)` | Maximum value | `max({bp1}, {bp2})` |

**Example:**
```
sqrt(({height} * {weight}) / 3600)
```

---

## Cross-Measure Formulas

**Cross-measure formulas** combine values from different measures at the **same timestamp**.

### Syntax

```
{measure1} operator {measure2}
```

### Use Cases

- **BMI:** Combine weight and height
- **Blood Pressure Metrics:** Combine systolic and diastolic
- **Body Ratios:** Combine multiple anthropometric measures

### Example: Body Mass Index (BMI)

**Formula:**
```
{weight} / ({height} * {height})
```

**How it works:**
1. Patient logs weight: `70 kg` at `10:00 AM`
2. Patient logs height: `1.75 m` at `10:00 AM`
3. System calculates BMI: `70 / (1.75 * 1.75) = 22.86 kg/m²`
4. BMI value stored at `10:00 AM`

### Example: Mean Arterial Pressure

**Formula:**
```
{diastolic_bp} + ({systolic_bp} - {diastolic_bp}) / 3
```

**How it works:**
1. Patient logs systolic BP: `120 mmHg`
2. Patient logs diastolic BP: `80 mmHg`
3. System calculates MAP: `80 + (120 - 80) / 3 = 93.33 mmHg`

---

## Time-Series Formulas

**Time-series formulas** use values from **different time points** to track changes over time.

### Modifiers

Use modifiers before the colon to specify which value to use:

| Modifier | Description | Example |
|----------|-------------|---------|
| `current:` | Most recent value at/before timestamp | `{current:weight}` |
| `previous:` | Value before current | `{previous:weight}` |
| `delta:` | Current minus previous | `{delta:weight}` |
| `avg30:` | 30-day rolling average | `{avg30:weight}` |
| `avg60:` | 60-day rolling average | `{avg60:glucose}` |
| `avg90:` | 90-day rolling average | `{avg90:blood_pressure}` |

### Syntax

```
{modifier:measure_name}
```

### Example: Weight Change

**Formula:**
```
{current:weight} - {previous:weight}
```

**How it works:**

| Time | Weight Logged | Weight Change Calculated |
|------|--------------|-------------------------|
| 8:00 AM | 70 kg | (no previous value) |
| 10:00 AM | 72 kg | `72 - 70 = +2 kg` |
| 12:00 PM | 71 kg | `71 - 72 = -1 kg` |

### Example: Change from 30-Day Average

**Formula:**
```
{current:weight} - {avg30:weight}
```

**How it works:**
- Calculates 30-day average of all weight values
- Compares current weight to that average
- Shows how much above/below the average

### Important Notes

⚠️ **First Value Behavior:**
- Time-series calculations require **previous data**
- No calculation happens for the **first logged value**
- `{previous:measure}` returns `null` if only one value exists

⚠️ **Timestamp Matters:**
- System uses `measured_at` timestamp
- Values must have different timestamps to be "previous"
- Same-timestamp values use `created_at` for ordering

---

## Using Templates

Templates provide **pre-built formulas** for common calculations.

### Accessing Templates

1. When creating a calculated measure
2. Click **"📋 Templates"** button
3. Browse available templates
4. Select a template
5. Click **"Apply Template"**

### Available Templates

#### Anthropometric Measures

**Body Mass Index (BMI)**
- **Formula:** `{weight} / ({height} * {height})`
- **Unit:** `kg/m²`
- **Dependencies:** weight (kg), height (m)
- **Use:** Standard obesity metric

**Body Surface Area (Mosteller)**
- **Formula:** `sqrt(({height} * {weight}) / 3600)`
- **Unit:** `m²`
- **Dependencies:** height (cm), weight (kg)
- **Use:** Medication dosing, burn assessment

**Waist-to-Height Ratio**
- **Formula:** `{waist_circumference} / {height}`
- **Unit:** (ratio)
- **Dependencies:** waist_circumference, height
- **Use:** Cardiovascular risk assessment

#### Vital Signs

**Mean Arterial Pressure**
- **Formula:** `{diastolic_bp} + ({systolic_bp} - {diastolic_bp}) / 3`
- **Unit:** `mmHg`
- **Dependencies:** systolic_bp, diastolic_bp
- **Use:** Blood perfusion assessment

**Pulse Pressure**
- **Formula:** `{systolic_bp} - {diastolic_bp}`
- **Unit:** `mmHg`
- **Dependencies:** systolic_bp, diastolic_bp
- **Use:** Arterial stiffness indicator

#### Trends

**Weight Change**
- **Formula:** `{current:weight} - {previous:weight}`
- **Unit:** `kg`
- **Dependencies:** weight
- **Use:** Track weight changes over time

**Weight Change Percentage**
- **Formula:** `({current:weight} - {previous:weight}) / {previous:weight} * 100`
- **Unit:** `%`
- **Dependencies:** weight
- **Use:** Percentage-based weight tracking

### Customizing Templates

After applying a template, you can:
- ✅ Modify the formula
- ✅ Change units
- ✅ Adjust decimal places
- ✅ Update description

---

## Testing Formulas

### Real-Time Validation

As you type, the system:
- ✅ Validates syntax
- ✅ Checks for balanced braces
- ✅ Verifies measure names exist
- ✅ Detects circular dependencies
- ✅ Shows dependencies list

**Valid Formula:**
```
✓ Formula is valid
Dependencies: weight, height
```

**Invalid Formula:**
```
✗ Invalid formula
Unbalanced braces in formula
```

### Preview Calculation

Test your formula with sample data **before saving**:

1. Click **"🔍 Preview Calculation"**
2. Enter sample values for each dependency
3. Click **"Calculate"**
4. View result

**Example:**
```
Formula: {weight} / ({height} * {height})

Sample Values:
- weight: 70
- height: 1.75

Result: 22.86
```

This helps you verify:
- Formula logic is correct
- Result is in expected range
- Decimal places are appropriate

---

## Common Examples

### Example 1: Ideal Body Weight (Devine Formula - Men)

**Formula:**
```
50 + 2.3 * (({height} * 100 - 152.4) / 2.54)
```

**Explanation:**
- `50` is base weight in kg
- `{height} * 100` converts meters to cm
- `152.4` is reference height (60 inches in cm)
- `/2.54` converts inches to cm
- `2.3` is weight per inch over reference

### Example 2: Percentage Body Fat Change

**Formula:**
```
({current:body_fat_percentage} - {previous:body_fat_percentage})
```

**Use Case:**
Track changes in body composition over time.

### Example 3: Estimated Average Glucose (eAG) from HbA1c

**Formula:**
```
({hba1c} * 28.7) - 46.7
```

**Explanation:**
- Converts HbA1c (%) to estimated average glucose (mg/dL)
- Based on ADAG study formula

### Example 4: Creatinine Clearance (Cockcroft-Gault)

**Formula:**
```
((140 - {age}) * {weight}) / (72 * {serum_creatinine})
```

**Note:** Multiply by 0.85 for females (would need separate measure)

### Example 5: Weight Moving Average (30 days)

**Formula:**
```
{avg30:weight}
```

**Use Case:**
Smooth out daily weight fluctuations to see overall trend.

---

## Best Practices

### Naming Conventions

✅ **DO:**
- Use descriptive internal names: `bmi`, `weight_change`
- Use clear display names: `Body Mass Index`, `Weight Change`
- Be consistent with units in names: `weight_kg`, `height_m`

❌ **DON'T:**
- Use cryptic names: `calc1`, `measure_x`
- Mix conventions: `weightKg`, `Height-Meters`
- Use special characters: `weight/height`, `bmi%`

### Formula Design

✅ **DO:**
- Keep formulas simple and readable
- Add parentheses for clarity: `(a + b) / c`
- Document complex formulas in description
- Test with realistic values
- Consider edge cases (zero, negative, null)

❌ **DON'T:**
- Create overly complex nested formulas
- Assume values are always present
- Forget about unit conversions
- Create circular dependencies

### Documentation

✅ **DO:**
- Write clear descriptions explaining what the measure calculates
- Note expected units for dependencies
- Document valid ranges
- Mention clinical significance

**Example Description:**
```
Calculates Body Mass Index (BMI) from weight (kg) and height (m).
BMI = weight / height²
Normal range: 18.5-24.9 kg/m²
```

### Dependency Management

✅ **DO:**
- Verify all dependencies exist before creating calculated measure
- Use standard measure names across system
- Document which measures are required
- Consider dependency order for cascading calculations

❌ **DON'T:**
- Create calculated measures before their dependencies
- Use measures that might be deleted
- Create long dependency chains (limit to 3-4 levels)

---

## Troubleshooting

### Common Errors

#### "Dependency not found: measure_name"

**Cause:** Referenced measure doesn't exist

**Solution:**
1. Check measure name spelling (case-sensitive)
2. Verify measure exists in Measure Definitions
3. Use internal `name`, not `display_name`
4. For time-series: check base measure exists (e.g., `weight` not `current:weight`)

#### "Unbalanced braces in formula"

**Cause:** Missing opening `{` or closing `}`

**Solution:**
- Count braces: every `{` needs a matching `}`
- Check formula: `{weight} / ({height} * {height})`
- NOT: `{weight / ({height} * {height})` ❌

#### "Circular dependency detected"

**Cause:** Measure A depends on B, B depends on A (or indirect loop)

**Example:**
```
Measure A: {b} + 1
Measure B: {a} + 1  ← Creates cycle!
```

**Solution:**
- Redesign formula logic
- Break circular dependency
- Use different source measures

#### "Division by zero"

**Cause:** Denominator equals zero

**Solution:**
- Add validation to source measure (min_value > 0)
- Handle in formula: `max({denominator}, 0.001)`
- Document that calculation requires non-zero values

#### "Invalid variable name"

**Cause:** Variable name contains invalid characters

**Solution:**
- Use only: `a-z`, `0-9`, `_`
- Start with letter: `weight_kg` ✅
- NOT: `weight-kg` ❌, `2nd_weight` ❌

### Validation Issues

**Formula validates but doesn't calculate:**

Possible causes:
1. **Missing dependencies:** Source measures not logged for patient
2. **Different timestamps:** Cross-measure formula needs same timestamp
3. **Insufficient history:** Time-series needs previous values
4. **Null values:** One or more dependencies have null values

**Check:**
- View patient's measures to verify source data exists
- Confirm timestamps match for cross-measure formulas
- Ensure adequate history for time-series formulas
- Review logs for calculation errors

### Getting Help

If you encounter issues:

1. **Check Validation:** Does formula validate without errors?
2. **Test Preview:** Does preview calculation work with sample data?
3. **Review Dependencies:** Do all dependent measures exist?
4. **Check Data:** Does patient have required source measures?
5. **View Logs:** Check system logs for calculation errors
6. **Consult Documentation:** Review this guide and test plan

---

## Advanced Topics

### Cascading Calculations

You can create calculated measures that depend on other calculated measures:

**Example:**
```
Level 1: BMI = {weight} / ({height} * {height})
Level 2: BMI_Change = {current:bmi} - {previous:bmi}
```

**How it works:**
1. System calculates measures in **topological order**
2. BMI calculated first (depends only on source measures)
3. BMI_Change calculated second (depends on BMI)

**Limits:**
- Maximum depth: 5 levels
- Avoid deep nesting (performance impact)
- Consider simplifying complex chains

### Multiple Dependencies

Formulas can reference multiple measures:

```
({weight} + {lean_mass} - {fat_mass}) / {height}
```

**All dependencies** must have values at the timestamp for calculation to occur.

### Conditional Logic Limitations

⚠️ The formula engine does **NOT support**:
- If/then/else statements
- Comparison operators (<, >, ==)
- Boolean logic (AND, OR, NOT)

**Workaround:**
- Use `min()` / `max()` for boundary conditions
- Create multiple calculated measures for different scenarios
- Use approximations

**Example (pseudo-ternary):**
```
Instead of: BMI < 18.5 ? "underweight" : "normal"
Use separate measures or external logic
```

---

## Appendix: Quick Reference

### Syntax Cheat Sheet

```
Variables:          {measure_name}
Time-series:        {current:measure_name}
                    {previous:measure_name}
                    {delta:measure_name}
                    {avg30:measure_name}

Operators:          +  -  *  /  ^
Parentheses:        ( )

Functions:          sqrt(x)
                    abs(x)
                    round(x, decimals)
                    floor(x)
                    ceil(x)
                    min(x, y, ...)
                    max(x, y, ...)
```

### Common Formulas

```
BMI:                    {weight} / ({height} * {height})
Weight Change:          {current:weight} - {previous:weight}
MAP:                    {diastolic_bp} + ({systolic_bp} - {diastolic_bp}) / 3
Pulse Pressure:         {systolic_bp} - {diastolic_bp}
BSA (Mosteller):        sqrt(({height} * {weight}) / 3600)
Waist-to-Height:        {waist_circumference} / {height}
```

### Validation Checklist

Before saving a calculated measure:

- [ ] Formula syntax is valid (no errors)
- [ ] All dependencies exist
- [ ] Units are correct
- [ ] Decimal places appropriate
- [ ] Preview calculation successful
- [ ] Description is clear
- [ ] Naming follows conventions
- [ ] No circular dependencies

---

## Support

For additional assistance:
- **Documentation:** `/backend/docs/US-5.4.2-TEST-PLAN.md`
- **Technical Details:** `/backend/docs/CALCULATED_MEASURES.md`
- **API Reference:** `/backend/docs/API.md`

**Created:** 2026-01-24
**Version:** 1.0
**Feature:** US-5.4.2 - Calculated Measures
