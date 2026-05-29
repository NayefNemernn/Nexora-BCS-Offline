import mongoose from "mongoose";

const licenseRecordSchema = new mongoose.Schema(
  {
    licenseId:          { type: String, required: true, unique: true },
    storeName:          { type: String, required: true },
    adminUsername:      { type: String, required: true },
    maxDevices:         { type: Number, default: 1 },
    issuedAt:           { type: Date,   default: Date.now },
    expiresAt:          { type: Date,   required: true },
    notes:              { type: String, default: "" },
    nexoraFileContent:  { type: String, required: true }, // full signed .nexora JSON
    renewalHistory: [{
      renewedAt:     { type: Date },
      newExpiresAt:  { type: Date },
    }],
    addedDevices: [{
      mac:       { type: String },
      addedAt:   { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

export default mongoose.model("LicenseRecord", licenseRecordSchema);
