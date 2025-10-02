# Troubleshooting Processing Errors

## 🔍 What "Processing Errors" Mean

When you see **"1 participant had processing errors"**, it means the system found issues with the data for that participant. The participant's result is still calculated, but some items may have been skipped.

---

## 📋 Common Processing Errors

### **1. Missing Response for Item X**
**Error Message:** `Missing response for item 5`

**Cause:** A cell in your CSV is empty

**Example Problem:**
```csv
S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7
Participant1,1,2,3,0,,1,2
                    ↑ Empty cell for Q5
```

**Solution:** Fill in all cells with valid values (0-3)
```csv
S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7
Participant1,1,2,3,0,1,1,2
```

---

### **2. Could Not Convert Response**
**Error Message:** `Could not convert "abc" for item 3`

**Cause:** The cell contains text that can't be converted to a number

**Example Problem:**
```csv
S/N,Q1,Q2,Q3,Q4,Q5
Participant1,1,2,abc,0,1
              ↑ Invalid text
```

**Solution:** Use only numeric values (0-3) or valid text responses
```csv
S/N,Q1,Q2,Q3,Q4,Q5
Participant1,1,2,2,0,1
```

---

### **3. Wrong Number of Columns**
**Error Message:** `Row 2 has 15 columns, expected 22`

**Cause:** Your data row doesn't have the same number of columns as the header

**Example Problem:**
```csv
S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7
Participant1,1,2,3,0,1
              ↑ Only 6 values, expected 7
```

**Solution:** Ensure every row has exactly the same number of columns
```csv
S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7
Participant1,1,2,3,0,1,2,1
```

---

## 🔧 How to Find the Error

### **Step 1: Check the Detailed Results Tab**
1. Click on the **"Detailed Results"** tab
2. Look for the row with the **orange warning icon** (⚠️)
3. **Click on the error button** or the **chevron icon** (▶) to expand and see detailed error messages
4. The expanded view shows:
   - ✅ Specific error messages for each item
   - 💡 Quick fix suggestions
   - 📖 Link to troubleshooting guide

### **Step 2: Check Your CSV File**
1. Open your CSV file in a text editor or Excel
2. Count the number of columns in the header row
3. Count the number of columns in each data row
4. Ensure they match

### **Step 3: Verify Data Format**

**For BDI-II (21 items):**
- Header: `S/N,Q1,Q2,Q3,...,Q21` (22 columns total)
- Data: `Participant1,1,2,3,...,0` (22 values total)

**For GAD-7 (7 items):**
- Header: `S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7` (8 columns total)
- Data: `Participant1,0,1,2,1,0,1,2` (8 values total)

**For PHQ-9 (9 items):**
- Header: `S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9` (10 columns total)
- Data: `Participant1,1,2,1,0,1,2,0,1,0` (10 values total)

---

## ✅ Valid Response Values

### **Numeric Format (Recommended):**
- `0` = Not at all / Minimal
- `1` = Several days / Mild
- `2` = More than half the days / Moderate
- `3` = Nearly every day / Severe

### **Text Format (Also Supported):**
- "Not at all", "Never", "None" → 0
- "Several days", "Sometimes", "Rarely" → 1
- "More than half the days", "Often", "Frequently" → 2
- "Nearly every day", "Always", "Constantly" → 3

---

## 🛠️ Quick Fix Checklist

- [ ] All cells are filled (no empty cells)
- [ ] All values are between 0-3 (or valid text responses)
- [ ] Header row has correct number of columns (e.g., 22 for BDI-II)
- [ ] Data row has same number of columns as header
- [ ] No extra commas at the end of rows
- [ ] No special characters in responses
- [ ] File is saved as CSV format

---

## 📊 Example: Correct Format

### **BDI-II (21 items) - CORRECT:**
```csv
S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9,Q10,Q11,Q12,Q13,Q14,Q15,Q16,Q17,Q18,Q19,Q20,Q21
Participant1,1,2,3,0,1,2,1,0,2,1,3,2,1,0,1,2,1,3,2,1,0
```
✅ 22 columns in header
✅ 22 values in data row
✅ All values are 0-3
✅ No empty cells

### **BDI-II (21 items) - INCORRECT:**
```csv
S/N,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9,Q10,Q11,Q12,Q13,Q14,Q15,Q16,Q17,Q18,Q19,Q20,Q21
Participant1,1,2,3,0,,2,1,0,2,1,3,2,1,0,1,2,1,3,2,1
```
❌ Empty cell for Q5
❌ Only 21 values (missing Q21)

---

## 🎯 Next Steps

1. **Check the "Detailed Results" tab** to see the exact error message
2. **Open your CSV file** and verify the format
3. **Fix the issues** based on the error messages
4. **Re-upload the corrected file**

If you're still having issues, please share:
- The exact error message from the Detailed Results tab
- The first few rows of your CSV file (you can use the example templates as reference)

---

## 📁 Use the Templates!

The easiest way to avoid errors is to use the provided templates:
- `example-template-BDI-II.csv`
- `example-template-GAD-7.csv`
- `example-template-PHQ-9.csv`

Just replace the sample data with your participant's actual responses!
