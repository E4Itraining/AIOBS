#!/bin/bash
# Script de nettoyage des branches Git obsolètes
# Usage: ./scripts/cleanup-branches.sh

set -e

echo "🔍 Analyse des branches..."

# Branche à garder (branche principale de facto)
MAIN_BRANCH="claude/ai-observability-hub-ZLGke"

# Récupérer toutes les branches claude/*
BRANCHES=$(git ls-remote --heads origin | grep "refs/heads/claude/" | awk '{print $2}' | sed 's|refs/heads/||')

# Compter les branches
TOTAL=$(echo "$BRANCHES" | wc -l)
echo "📊 Total de branches claude/*: $TOTAL"

# Lister les branches à supprimer (toutes sauf la branche principale)
TO_DELETE=$(echo "$BRANCHES" | grep -v "$MAIN_BRANCH" || true)
COUNT=$(echo "$TO_DELETE" | grep -c . || echo "0")

echo "🗑️  Branches à supprimer: $COUNT"
echo ""

if [ "$COUNT" -eq 0 ]; then
    echo "✅ Aucune branche à nettoyer!"
    exit 0
fi

echo "Les branches suivantes seront supprimées:"
echo "$TO_DELETE" | head -20
if [ "$COUNT" -gt 20 ]; then
    echo "... et $((COUNT - 20)) autres"
fi

echo ""
read -p "Confirmer la suppression? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Annulé"
    exit 1
fi

echo ""
echo "🚀 Suppression en cours..."

SUCCESS=0
FAILED=0

for branch in $TO_DELETE; do
    echo -n "  Suppression: $branch... "
    if git push origin --delete "$branch" 2>/dev/null; then
        echo "✅"
        ((SUCCESS++))
    else
        echo "❌"
        ((FAILED++))
    fi
done

echo ""
echo "📊 Résumé:"
echo "  ✅ Supprimées: $SUCCESS"
echo "  ❌ Échecs: $FAILED"
echo ""

# Nettoyer les références locales
echo "🧹 Nettoyage des références locales..."
git remote prune origin

echo ""
echo "✅ Nettoyage terminé!"
echo ""
echo "💡 Pour éviter ce problème à l'avenir:"
echo "   1. Créez une branche 'main' sur GitHub"
echo "   2. Activez 'Automatically delete head branches' dans Settings > General"
echo "   3. Mergez toujours les PRs dans 'main'"
