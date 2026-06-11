# Psychology Scoring System - User Guide

## ✅ FIXES APPLIED

### 1. **Column Header Recognition**
- System now recognizes multiple header formats: `Q1`, `q1`, `Item1`, `item1`, `item_1`, `1`
- No more case-sensitivity issues

### 2. **Complete Scale Items**
- **BDI-II**: All 21 items now included (was only 3)
- **GAD-7**: All 7 items now included (was only 3)
- **PHQ-9**: All 9 items now included (was only 2)
- **Big Five**: 50 items (sample items included)

### 3. **Scoring Calculations**
- Total score now calculates correctly
- Severity interpretation works properly
- Overview statistics match the results

### 4. **Enhanced Overview Dashboard**
- **Single Participant View**: Shows prominent result card with Total Score, Severity, and Interpretation
- **Multiple Participants View**: Shows aggregate statistics and distribution
- Automatically adapts based on number of participants

---

## 📊 HOW TO FORMAT YOUR DATA

### **IMPORTANT: Data Structure**

The system processes **MULTIPLE PARTICIPANTS** at once, where:
- Each **ROW** = One participant
- Each **COLUMN** = One question/item

### **Correct Format Example (BDI-II with 21 items):**

```csv
S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9,Q10,Q11,Q12,Q13,Q14,Q15,Q16,Q17,Q18,Q19,Q20,Q21
Participant1,1,2,3,0,1,2,1,0,2,1,3,2,1,0,1,2,1,3,2,1,0
Participant2,0,1,1,2,0,1,0,2,1,0,2,1,0,1,2,0,1,2,1,0,1
```

### **Column Requirements by Scale:**

| Scale | Items | Total Columns Needed |
|-------|-------|---------------------|
| BDI-II | 21 | 22 (1 ID + 21 questions) |
| GAD-7 | 7 | 8 (1 ID + 7 questions) |
| PHQ-9 | 9 | 10 (1 ID + 9 questions) |
| Big Five | 50 | 51 (1 ID + 50 questions) |

---

## 📝 STEP-BY-STEP USAGE

### **Step 1: Prepare Your Data**

If you have data in **vertical format** (one question per row):
```
Q1: 1
Q2: 2
Q3: 3
...
```

**Convert it to horizontal format** (one participant per row):
```csv
S/N,Q1,Q2,Q3,...
Participant1,1,2,3,...
```

### **Step 2: Use the Template**

I've created a template file: `example-template-BDI-II.csv`

**For BDI-II (21 items):**
- Header row: `S/N,Q1,Q2,Q3,...,Q21`
- Data row: Your participant's 21 answers

**For GAD-7 (7 items):**
- Header row: `S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7`
- Data row: Your participant's 7 answers

**For PHQ-9 (9 items):**
- Header row: `S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9`
- Data row: Your participant's 9 answers

### **Step 3: Upload to System**

1. Select the appropriate scale (BDI-II, GAD-7, PHQ-9, or Big Five)
2. Upload your CSV file
3. Review the format detection
4. Click "Continue Processing"
5. View results with:
   - **Total Score**
   - **Severity Level**
   - **Interpretation**
   - **Overview Statistics**

---

## 🔢 RESPONSE VALUES

### **Numeric Format (0-3 scale for BDI-II, GAD-7, PHQ-9):**
- `0` = Not at all / Minimal
- `1` = Several days / Mild
- `2` = More than half the days / Moderate
- `3` = Nearly every day / Severe

### **Text Format (also supported):**
- "Not at all", "Never", "None"
- "Several days", "Sometimes", "Rarely"
- "More than half the days", "Often", "Frequently"
- "Nearly every day", "Always", "Constantly"

---

## 📈 INTERPRETATION RANGES

### **BDI-II (Beck Depression Inventory-II)**
- 0-13: Minimal depression
- 14-19: Mild depression
- 20-28: Moderate depression
- 29-63: Severe depression

### **GAD-7 (Generalized Anxiety Disorder)**
- 0-4: Minimal anxiety
- 5-9: Mild anxiety
- 10-14: Moderate anxiety
- 15-21: Severe anxiety

### **PHQ-9 (Patient Health Questionnaire)**
- 0-4: Minimal depression
- 5-9: Mild depression
- 10-14: Moderate depression
- 15-19: Moderately severe depression
- 20-27: Severe depression

---

## ❓ TROUBLESHOOTING

### **Error: "Row X has Y columns, expected Z"**
- **Cause**: Your data row doesn't have the same number of columns as the header
- **Fix**: Ensure every row has exactly the same number of columns

### **Error: "Missing response for item X"**
- **Cause**: A cell is empty or the column header doesn't match expected format
- **Fix**: Fill in all cells and use headers like Q1, Q2, Q3, etc.

### **Total Score shows 0**
- **Cause**: Column headers don't match or scale items are missing
- **Fix**: Use the provided template or ensure headers are Q1, Q2, Q3, etc.

### **Severity shows "Unknown"**
- **Cause**: Total score is outside the expected range
- **Fix**: Verify all response values are within 0-3 range

---

## 📁 EXAMPLE FILES

Check the `example-template-BDI-II.csv` file for a working example.

To create templates for other scales:
- **GAD-7**: 8 columns (S/N + Q1 to Q7)
- **PHQ-9**: 10 columns (S/N + Q1 to Q9)
- **Big Five**: 51 columns (S/N + Q1 to Q50)
