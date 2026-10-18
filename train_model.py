import pandas as pd, joblib, json, os
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
HERE = os.path.dirname(__file__)
df = pd.read_csv(os.path.join(HERE, "gesture_dataset_1000.csv"))
drop = {"sample_id","gesture_label","device_type","device_action","action_value","split"}
features = [c for c in df.columns if c not in drop]
tr, va, te = (df[df.split == s] for s in ("train","val","test"))
model = RandomForestClassifier(n_estimators=400, max_depth=12, class_weight="balanced", random_state=42, n_jobs=-1)
model.fit(tr[features], tr.gesture_label)
metrics = {
  "validation_accuracy": float(accuracy_score(va.gesture_label, model.predict(va[features]))),
  "test_accuracy": float(accuracy_score(te.gesture_label, model.predict(te[features]))),
  "test_report": classification_report(te.gesture_label, model.predict(te[features]), output_dict=True, zero_division=0)
}
joblib.dump({"model":model, "feature_cols":features}, os.path.join(HERE,"gesture_model.joblib"))
with open(os.path.join(HERE,"training_metrics.json"),"w") as f: json.dump(metrics,f,indent=2)
print(json.dumps({k:v for k,v in metrics.items() if "report" not in k}, indent=2))
