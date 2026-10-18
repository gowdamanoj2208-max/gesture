"""Synthetic pose-keypoint dataset for gesture-controlled devices (PipeGen -> FirmGen).
Keypoints: normalized image coords (x right, y down), MediaPipe-style upper-body subset.
'right_*' = subject's right side (appears on image-left in a mirrored/selfie-free front view)."""
import numpy as np, pandas as pd
rng = np.random.default_rng(42)
N_PER = 125  # 8 classes x 125 = 1000

# gesture -> (right upper-arm deg, right forearm deg, left upper, left forearm); 0=down, 90=sideways out, 180=up, negative=inward
G = {
 "idle":              ((8,8),(0,12),   (8,8),(0,12)),
 "right_hand_up":     ((150,15),(170,10),(8,8),(0,12)),
 "left_hand_up":      ((8,8),(0,12),   (150,15),(170,10)),
 "both_hands_up":     ((150,15),(170,10),(150,15),(170,10)),
 "right_arm_out":     ((90,8),(90,8),  (8,8),(0,12)),
 "left_arm_out":      ((8,8),(0,12),   (90,8),(90,8)),
 "arms_crossed":      ((20,8),(-100,10),(20,8),(-100,10)),
 "hands_together":    ((12,6),(-30,8), (12,6),(-30,8)),
}
ACTION = {  # gesture -> (device_type, device_action, action_value)
 "idle":("none","no_action",0),
 "right_hand_up":("light","light_on",1),
 "left_hand_up":("light","light_off",0),
 "both_hands_up":("relay","relay_toggle",1),
 "right_arm_out":("servo","servo_rotate_right",90),
 "left_arm_out":("servo","servo_rotate_left",-90),
 "arms_crossed":("relay","relay_off_emergency_stop",0),
 "hands_together":("servo","servo_home",0),
}
def arm(shoulder, s, L, F, tu, tf):
    tu, tf = np.radians(tu), np.radians(tf)
    elbow = shoulder + L*np.array([s*np.sin(tu), np.cos(tu)])
    wrist = elbow + F*np.array([s*np.sin(tf), np.cos(tf)])
    return elbow, wrist
def ang(a,b,c):
    v1,v2=a-b,c-b
    return np.degrees(np.arccos(np.clip(v1@v2/(np.linalg.norm(v1)*np.linalg.norm(v2)+1e-9),-1,1)))
rows=[]
for g,(ru,rf,lu,lf) in G.items():
    for _ in range(N_PER):
        w=rng.uniform(.18,.28); cx=rng.uniform(.4,.6); sy=rng.uniform(.3,.42)
        rs=np.array([cx-w/2,sy]); ls=np.array([cx+w/2,sy])
        nose=np.array([cx,sy-rng.uniform(.10,.15)*w/.23])
        L=w*rng.uniform(.9,1.1); F=w*rng.uniform(.9,1.1)
        j=lambda p:rng.normal(p[0],p[1])
        re,rw=arm(rs,-1,L,F,j(ru),j(rf)); le,lw=arm(ls,1,L,F,j(lu),j(lf))
        pts=[nose,ls,rs,le,re,lw,rw]
        pts=[p+rng.normal(0,.008,2) for p in pts]
        nose,ls,rs,le,re,lw,rw=pts
        r=dict(zip(
            ["nose_x","nose_y","l_shoulder_x","l_shoulder_y","r_shoulder_x","r_shoulder_y",
             "l_elbow_x","l_elbow_y","r_elbow_x","r_elbow_y","l_wrist_x","l_wrist_y","r_wrist_x","r_wrist_y"],
            np.round(np.concatenate(pts),4)))
        sw=np.linalg.norm(ls-rs)
        r["l_elbow_angle"]=round(ang(ls,le,lw),1); r["r_elbow_angle"]=round(ang(rs,re,rw),1)
        r["l_wrist_rel_y"]=round((lw[1]-ls[1])/sw,3); r["r_wrist_rel_y"]=round((rw[1]-rs[1])/sw,3)
        r["wrist_distance"]=round(np.linalg.norm(lw-rw)/sw,3)
        r["gesture_label"]=g
        r["device_type"],r["device_action"],r["action_value"]=ACTION[g]
        rows.append(r)
df=pd.DataFrame(rows).sample(frac=1,random_state=1).reset_index(drop=True)
df.insert(0,"sample_id",range(1,len(df)+1))
df["split"]=["train"]*700+["val"]*150+["test"]*150
df.to_csv("/mnt/user-data/outputs/gesture_dataset_1000.csv",index=False)
print(df.shape); print(df.gesture_label.value_counts()); print(df.head(3).T)
