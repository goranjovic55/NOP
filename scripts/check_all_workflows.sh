#!/bin/bash
# Batch AKIS Protocol Compliance Checker
# Analyzes all workflow logs and generates summary report

cd "$(dirname "$0")/.." || exit 1

echo "============================================================"
echo "AKIS Protocol Compliance - Batch Analysis"
echo "============================================================"
echo ""

# Initialize counters
total_logs=0
full_compliance=0
partial_compliance=0
no_compliance=0

# Temporary file for detailed results
temp_results=$(mktemp)

# Process each workflow log (excluding README)
for log_file in log/workflow/*.md; do
    if [ "$(basename "$log_file")" = "README.md" ]; then
        continue
    fi
    
    total_logs=$((total_logs + 1))
    
    # Run compliance check and capture output
    if ./scripts/check_workflow_compliance.sh "$log_file" > "$temp_results" 2>&1; then
        # Extract score
        score=$(grep "Compliance Score:" "$temp_results" | grep -oP '\d+/\d+' | head -1)
        score_num=$(echo "$score" | cut -d'/' -f1)
        score_denom=$(echo "$score" | cut -d'/' -f2)
        
        if [ "$score_num" -eq "$score_denom" ]; then
            full_compliance=$((full_compliance + 1))
            status="✅ FULL"
        else
            partial_compliance=$((partial_compliance + 1))
            status="⚠️  PARTIAL"
        fi
    else
        # Extract score even on failure
        score=$(grep "Compliance Score:" "$temp_results" | grep -oP '\d+/\d+' | head -1)
        if [ -z "$score" ]; then
            score="0/5"
        fi
        score_num=$(echo "$score" | cut -d'/' -f1)
        
        if [ "$score_num" -ge 3 ]; then
            partial_compliance=$((partial_compliance + 1))
            status="⚠️  PARTIAL"
        else
            no_compliance=$((no_compliance + 1))
            status="❌ NONE"
        fi
    fi
    
    # Print short summary for this log
    log_name=$(basename "$log_file")
    printf "%-60s %s (%s)\n" "$log_name" "$status" "$score"
done

rm -f "$temp_results"

echo ""
echo "============================================================"
echo "Summary Statistics"
echo "============================================================"
echo "Total workflow logs: $total_logs"
echo "Full compliance (5/5): $full_compliance ($(echo "scale=1; $full_compliance * 100 / $total_logs" | bc)%)"
echo "Partial compliance (3-4/5): $partial_compliance ($(echo "scale=1; $partial_compliance * 100 / $total_logs" | bc)%)"
echo "No/Low compliance (0-2/5): $no_compliance ($(echo "scale=1; $no_compliance * 100 / $total_logs" | bc)%)"
echo ""

# Calculate overall compliance rate
if [ $total_logs -gt 0 ]; then
    compliant=$((full_compliance + partial_compliance))
    compliance_rate=$(echo "scale=1; $compliant * 100 / $total_logs" | bc)
    echo "Overall compliance rate: $compliance_rate%"
    
    # Target check
    if echo "$compliance_rate >= 80" | bc -l | grep -q 1; then
        echo "Status: ✅ MEETS TARGET (80%+)"
    else
        gap=$(echo "80 - $compliance_rate" | bc)
        echo "Status: ❌ BELOW TARGET (gap: $gap%)"
    fi
fi

echo "============================================================"
