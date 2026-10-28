"""
MIMIC-IV-ED Demo Ingestion Pipeline
Downloads and validates the official MIMIC-IV-ED Demo dataset from PhysioNet.
Official source: https://physionet.org/content/mimic-iv-ed-demo/2.2/
"""

import os
import gzip
import shutil
import urllib.request
import ssl
import pandas as pd
from pathlib import Path

BASE_URL = "https://physionet.org/files/mimic-iv-ed-demo/2.2/ed"
FILES = [
    "triage.csv.gz",
    "edstays.csv.gz",
    "vitalsign.csv.gz"
]

RAW_DIR = Path("ml/data/raw")
PROCESSED_DIR = Path("ml/data/processed")

def download_and_extract():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    
    ctx = ssl.create_default_context()
    
    for filename in FILES:
        gz_path = RAW_DIR / filename
        csv_name = filename.replace(".gz", "")
        csv_path = RAW_DIR / csv_name
        
        if not csv_path.exists():
            print(f"Downloading {filename} from PhysioNet MIMIC-IV-ED Demo...")
            url = f"{BASE_URL}/{filename}"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, context=ctx, timeout=30) as response, open(gz_path, "wb") as out_file:
                shutil.copyfileobj(response, out_file)
            
            print(f"Extracting {filename} -> {csv_name}...")
            with gzip.open(gz_path, "rb") as f_in, open(csv_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)
            
            print(f"Successfully saved {csv_path} ({os.path.getsize(csv_path)} bytes)")
        else:
            print(f"File {csv_path} already exists. Skipping download.")

def validate_raw_data():
    triage_path = RAW_DIR / "triage.csv"
    edstays_path = RAW_DIR / "edstays.csv"
    
    if not triage_path.exists() or not edstays_path.exists():
        raise FileNotFoundError("Raw data files missing after ingestion.")
        
    df_triage = pd.read_csv(triage_path)
    df_edstays = pd.read_csv(edstays_path)
    
    print(f"\n[Validation] MIMIC-IV-ED Demo Loaded:")
    print(f" - Triage records: {len(df_triage)} rows, columns: {list(df_triage.columns)}")
    print(f" - ED Stays records: {len(df_edstays)} rows, columns: {list(df_edstays.columns)}")
    
    # Check acuity distribution
    if "acuity" in df_triage.columns:
        print(f" - Acuity distribution:\n{df_triage['acuity'].value_counts(dropna=False)}")
        
    return df_triage, df_edstays

if __name__ == "__main__":
    download_and_extract()
    validate_raw_data()
