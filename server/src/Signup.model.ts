import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const SignupSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  isConfirmed: { type: Boolean, required: true, default: false },
  confirmationId: {
    type: String,
    default: "",
    required: true,
    set: () => {
      return uuidv4();
    },
  },
  lists: { type: [String], default: ["newsletter"] },
});

export const Signup = mongoose.model("signup", SignupSchema);
