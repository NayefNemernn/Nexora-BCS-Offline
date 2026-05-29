import mongoose from "mongoose";

const cafeTriviaQuestionSchema = new mongoose.Schema({
  storeId:      { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },
  question:     { type: String, required: true, trim: true },
  options:      { type: [String], validate: v => v.length === 4 },
  correctIndex: { type: Number, min: 0, max: 3, required: true },
  category:     { type: String, default: "general" },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("CafeTriviaQuestion", cafeTriviaQuestionSchema);
