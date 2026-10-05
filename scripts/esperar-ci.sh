#!/usr/bin/env bash
# Espera a que terminen los checks de un commit (o de la punta de una rama) y muestra el resultado de cada trabajo.
# Uso: scripts/esperar-ci.sh <sha|rama>   (sale con 1 si algo falló)
set -u
R=Frandiopacheco/LPS911
SHA=$(gh api "repos/$R/commits/$1" --jq .sha)
t0=$(date +%s)
while :; do
  J=$(gh api "repos/$R/commits/$SHA/check-runs?per_page=50" --jq '.check_runs[] | "\(.status)|\(.conclusion)|\(.name)"')
  if [ -n "$J" ] && ! grep -qvE '^completed\|' <<<"$J"; then break; fi
  sleep 30
done
echo "$J" | cut -d'|' -f2,3 | sort
echo "($(( ($(date +%s)-t0)/60 )) min esperando)"
! grep -qE '^completed\|(failure|cancelled|timed_out)\|' <<<"$J"
