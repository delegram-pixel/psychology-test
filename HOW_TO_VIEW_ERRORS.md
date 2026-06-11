# How to View Processing Errors - Step by Step

## ✅ NEW FEATURE: Expandable Error Details

You can now **click to expand** and see the exact error messages in the Detailed Results tab!

---

## 📋 Step-by-Step Instructions

### **Step 1: Go to Detailed Results Tab**
After uploading your file, click on the **"Detailed Results"** tab at the top.

### **Step 2: Look for the Error Indicator**
Find the row with the **orange warning icon** (⚠️) in the Status column:

```
┌─────────────┬──────┬──────────┬───────────────┬─────────────┐
│ Participant │Score │ Severity │Interpretation │   Status    │
├─────────────┼──────┼──────────┼───────────────┼─────────────┤
│ ▶ John Doe  │  15  │   Mild   │ Mild anxiety  │ ⚠️ 2 error(s)│
└─────────────┴──────┴──────────┴───────────────┴─────────────┘
```

### **Step 3: Click to Expand**
You can click on **TWO places** to expand the error details:

1. **Click the chevron icon** (▶) next to the participant name
2. **Click the error button** (⚠️ 2 error(s)) in the Status column

### **Step 4: View Error Details**
The row will expand to show a detailed error panel:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Processing Errors for John Doe:                          │
│                                                              │
│ • Missing response for item 5                               │
│ • Missing response for item 12                              │
│                                                              │
│ 💡 How to Fix:                                              │
│ • Check your CSV file for empty cells                       │
│ • Ensure all values are between 0-3                         │
│ • Verify you have the correct number of columns             │
│ • See TROUBLESHOOTING_ERRORS.md for detailed help           │
└─────────────────────────────────────────────────────────────┘
```

### **Step 5: Fix the Issues**
Based on the error messages:
1. Open your CSV file
2. Find the problematic items (e.g., Q5, Q12)
3. Fill in the missing values or fix invalid ones
4. Save the file
5. Re-upload to the system

---

## 🎯 Visual Example

### **Before Clicking (Collapsed):**
```
┌──────────────────────────────────────────────────────────────┐
│ Detailed Results                                             │
├──────────────────────────────────────────────────────────────┤
│ Participant ID │ Score │ Severity │ Interpretation │ Status  │
├────────────────┼───────┼──────────┼────────────────┼─────────┤
│ ▶ Participant1 │  27   │ Moderate │ Moderate...    │⚠️ 3 err │ ← Click here
└────────────────┴───────┴──────────┴────────────────┴─────────┘
```

### **After Clicking (Expanded):**
```
┌──────────────────────────────────────────────────────────────┐
│ Detailed Results                                             │
├──────────────────────────────────────────────────────────────┤
│ Participant ID │ Score │ Severity │ Interpretation │ Status  │
├────────────────┼───────┼──────────┼────────────────┼─────────┤
│ ▼ Participant1 │  27   │ Moderate │ Moderate...    │⚠️ 3 err │
├────────────────┴───────┴──────────┴────────────────┴─────────┤
│ ⚠️ Processing Errors for Participant1:                       │
│                                                               │
│ • Missing response for item 5                                │
│ • Missing response for item 12                               │
│ • Could not convert "N/A" for item 18                        │
│                                                               │
│ 💡 How to Fix:                                               │
│ • Check your CSV file for empty cells                        │
│ • Ensure all values are between 0-3                          │
│ • Verify you have the correct number of columns              │
│ • See TROUBLESHOOTING_ERRORS.md for detailed help            │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔍 What Each Error Means

### **"Missing response for item X"**
- **Meaning:** Cell for question X is empty
- **Location:** Row for your participant, column QX
- **Fix:** Add a value (0-3) in that cell

### **"Could not convert 'text' for item X"**
- **Meaning:** The value in cell QX is not a valid number or text response
- **Location:** Row for your participant, column QX
- **Fix:** Replace with a valid value (0-3)

---

## 💡 Pro Tips

1. **Multiple Errors:** If you have multiple participants with errors, you can expand multiple rows at once
2. **Collapse:** Click the chevron (▼) or error button again to collapse the error details
3. **Search:** Use the search box to filter participants by name
4. **Filter:** Use the severity filter to focus on specific groups

---

## 📖 Related Documentation

- **TROUBLESHOOTING_ERRORS.md** - Detailed error explanations and solutions
- **HOW_TO_USE.md** - General usage guide
- **OVERVIEW_DASHBOARD_EXPLAINED.md** - Understanding the dashboard

---

## ✅ Summary

**To view error details:**
1. Go to **Detailed Results** tab
2. Find row with **⚠️ icon**
3. **Click** the chevron (▶) or error button
4. View **expanded error panel**
5. Fix issues in your CSV
6. Re-upload

**Now you can see exactly what's wrong with your data!** 🎉
