#!/bin/bash
# Performance Auditor — DreamWeave
# Hook PostToolUse : scan statique après chaque Edit/Write
# Stdin : JSON hook context { tool_input: { file_path } }

TOOL_INPUT=$(cat)

FILE=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)

FILE=$(echo "$FILE" | tr '\\\\' '/')

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exit 0
fi

if ! echo "$FILE" | grep -qE '\.(tsx|ts|css)$'; then
  exit 0
fi

ISSUES=""

# ── CRITIQUE ────────────────────────────────────────────────────────────────

# background-attachment: fixed → tue la composition GPU du scroll
if grep -q "background-attachment.*fixed" "$FILE" 2>/dev/null; then
  ISSUES="${ISSUES}\n  🔴 background-attachment:fixed → remplacer par ::before { position:fixed; inset:0; z-index:-1 }"
fi

# transition: all → coûteux (force layout + paint + composite)
if grep -q "transition.*all\b\|transition: all" "$FILE" 2>/dev/null; then
  ISSUES="${ISSUES}\n  🔴 transition:all → spécifier la propriété exacte (ex: transition: opacity 0.3s ease)"
fi

# ── IMPORTANT ───────────────────────────────────────────────────────────────

# setInterval/setTimeout sans cleanup
if echo "$FILE" | grep -qE '\.tsx?$'; then
  if grep -q "setInterval\|setTimeout" "$FILE" 2>/dev/null; then
    if ! grep -q "clearInterval\|clearTimeout" "$FILE" 2>/dev/null; then
      ISSUES="${ISSUES}\n  🟡 setInterval/setTimeout sans clear → memory leak (ajouter cleanup dans useEffect)"
    fi
  fi
fi

# addEventListener sans removeEventListener (dans des fichiers TSX/TS)
if echo "$FILE" | grep -qE '\.tsx?$'; then
  ADD_COUNT=$(grep -c "addEventListener" "$FILE" 2>/dev/null || echo 0)
  REMOVE_COUNT=$(grep -c "removeEventListener" "$FILE" 2>/dev/null || echo 0)
  if [ "$ADD_COUNT" -gt "$REMOVE_COUNT" ] && [ "$ADD_COUNT" -gt 0 ]; then
    MISSING=$((ADD_COUNT - REMOVE_COUNT))
    ISSUES="${ISSUES}\n  🟡 $MISSING addEventListener sans removeEventListener correspondant → memory leak"
  fi
fi

# <img> sans loading="lazy"
if echo "$FILE" | grep -qE '\.tsx$'; then
  IMG_COUNT=$(grep -c "<img " "$FILE" 2>/dev/null || echo 0)
  LAZY_COUNT=$(grep -c 'loading=' "$FILE" 2>/dev/null || echo 0)
  if [ "$IMG_COUNT" -gt 0 ] && [ "$IMG_COUNT" -gt "$LAZY_COUNT" ]; then
    DIFF=$((IMG_COUNT - LAZY_COUNT))
    ISSUES="${ISSUES}\n  🟡 $DIFF balise(s) <img> sans loading=\"lazy\" → layout shift + chargement bloquant"
  fi
fi

# key={Math.random()} ou key={index} dans les listes
if echo "$FILE" | grep -qE '\.tsx$'; then
  if grep -q "key={Math.random\(\)}" "$FILE" 2>/dev/null; then
    ISSUES="${ISSUES}\n  🟡 key={Math.random()} détecté → clé instable, démonte/remonte le composant à chaque render"
  fi
fi

# ── RÉSULTAT ─────────────────────────────────────────────────────────────────

if [ -n "$ISSUES" ]; then
  FILENAME=$(basename "$FILE")
  echo ""
  echo "⚡ Performance Auditor — problème(s) dans [$FILENAME] :"
  echo -e "$ISSUES"
  echo ""
  echo "Corrige ces points. L'expérience visuelle ne doit pas changer."
  exit 1
fi

exit 0
