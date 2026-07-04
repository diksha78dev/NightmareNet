<!-- robustness-delta-comment -->
## Robustness Regression Report

| Metric | main | This PR | Delta | Status |
|--------|------|---------|-------|--------|
| Clean Accuracy | 89.7% | 90.1% | +0.4% | ✅ Pass |
| TextFooler 0.5 | 51.3% | 53.8% | +2.5% | ✅ Pass |
| BertAttack 0.7 | 42.1% | 41.8% | -0.3% | ⚠️ Warning |
| Overall Robustness | 0.683 | 0.701 | +0.018 | ✅ Pass |

**Verdict: PASS** (no metric regressed beyond threshold of -5.0%)