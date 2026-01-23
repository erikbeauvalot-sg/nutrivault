# Translation System Explanation

## 🎯 Understanding "Target Language"

### The Two Values:

```
┌─────────────────────────────────────────────────┐
│  FIELD DEFINITION (in database)                 │
│  ─────────────────────────────────────          │
│  field_label: "Tabagisme - Quantité par jour"   │ ← ORIGINAL (French)
│  help_text: "Nombre de cigarettes par jour..."  │
└─────────────────────────────────────────────────┘
                      ↓
                      ↓ (When user language = 'en')
                      ↓
┌─────────────────────────────────────────────────┐
│  TRANSLATION TABLE                              │
│  ─────────────────────────────                  │
│  language_code: 'en'                            │ ← TARGET LANGUAGE
│  field_name: 'field_label'                      │
│  translated_value: "Smoking – Quantity per day" │
└─────────────────────────────────────────────────┘
```

### What You See in the UI:

When editing translations (Admin → Custom Fields → Edit Field → Translations tab):

```
┌────────────────────────────────────────────┐
│  🌍 Target Language: [🇬🇧 English]        │ ← Language you're translating TO
├────────────────────────────────────────────┤
│                                            │
│  Field Label:                              │
│  🇫🇷 French: Tabagisme - Quantité par jour │ ← REFERENCE (original)
│  ┌──────────────────────────────────────┐ │
│  │ Smoking – Quantity per day           │ │ ← Your English translation
│  └──────────────────────────────────────┘ │
│                                            │
│  [💾 Save Translations]                   │
└────────────────────────────────────────────┘
```

## 🔄 How It Works When Users View:

### Scenario 1: User with French language preference
```
User Profile: language_preference = 'fr'
        ↓
API receives: GET /api/patients/123/custom-fields?language=fr
        ↓
Backend: "Language is 'fr', use ORIGINAL values"
        ↓
User sees: "Tabagisme - Quantité par jour" ✅
```

### Scenario 2: User with English language preference
```
User Profile: language_preference = 'en'
        ↓
API receives: GET /api/patients/123/custom-fields?language=en
        ↓
Backend: "Language is 'en', lookup translation"
        ↓
Backend finds: translated_value = "Smoking – Quantity per day"
        ↓
User sees: "Smoking – Quantity per day" ✅
```

## 🐛 Current Issue: "Always showing English"

If you're seeing English when you expect French, check:

### 1️⃣ Your Language Preference
```bash
# Check your user's language setting
sqlite3 backend/data/nutrivault.db "
  SELECT username, language_preference
  FROM users
  WHERE username = 'admin';
"
```

**Expected**: Should be `fr` for French

### 2️⃣ Browser Console
Open Developer Tools → Network tab:
- Refresh the patient page
- Look for request to `/api/patients/.../custom-fields`
- Check the `language` parameter in the URL

**What to look for**:
- If you see `?language=en` → That's why it shows English!
- If you see `?language=fr` or no parameter → Should show French

### 3️⃣ Browser Cache
Sometimes React state gets stuck:
- **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or clear browser cache completely

## 🔧 Quick Fix Steps:

1. **Check your language preference**:
   ```
   Profile → Language Preference → Make sure it says "Français"
   ```

2. **Hard refresh the page**:
   ```
   Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   ```

3. **Verify in browser console**:
   ```javascript
   // Open Console (F12) and type:
   localStorage.getItem('i18nextLng')
   // Should return: "fr" for French, "en" for English
   ```

4. **If still showing English**, force French:
   ```javascript
   // In browser console:
   localStorage.setItem('i18nextLng', 'fr');
   location.reload();
   ```

## 📊 Expected Behavior:

| Your Language Setting | What You Should See                      |
|-----------------------|------------------------------------------|
| Français (fr)         | Tabagisme - Quantité par jour            |
| English (en)          | Smoking – Quantity per day               |

## 🎯 Summary:

- **"Target Language"** = The language you're translating INTO (e.g., English)
- **"French"** (shown as reference) = The ORIGINAL value
- **Original field** = Always French (the default language)
- **Translations** = Other languages (English, Spanish, etc.)
- **What users see** = Depends on THEIR language preference

---

## 💡 Still Not Working?

Please share:
1. What language is selected in your Profile?
2. What do you see on the patient page?
3. What do you EXPECT to see?
4. Screenshot of the field showing "wrong" language?

This will help me identify the exact issue!
