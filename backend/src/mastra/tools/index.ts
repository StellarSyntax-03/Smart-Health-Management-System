import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { searchDrugs } from "../../services/ekaCareService.js";
import prisma from "../../config/database.js";

export const drugSearchTool = createTool({
  id: "drug-search",
  description: "Search for medicines/drugs by name or condition. Returns drug name, generic composition, manufacturer, type, and dosage form. After getting results, you MUST cross-reference with the patient's allergies, age, chronic conditions, and current medications before presenting any suggestion.",
  inputSchema: z.object({
    query: z.string().describe("Medicine name or active ingredient to search for, e.g. 'paracetamol', 'cetirizine', 'amoxicillin'"),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      name: z.string(),
      generic_name: z.string().optional(),
      manufacturer_name: z.string().optional(),
      product_type: z.string().optional(),
      product_sku: z.string().optional(),
    })),
  }),
  execute: async (input) => {
    const results = await searchDrugs(input.query, 8);
    return {
      results: results.map((d) => ({
        name: d.name,
        generic_name: d.generic_name,
        manufacturer_name: d.manufacturer_name,
        product_type: d.product_type,
        product_sku: d.product_sku,
      })),
    };
  },
});

export const doctorSearchTool = createTool({
  id: "doctor-search",
  description: "Search for available doctors by specialization. Use when patient asks for doctor recommendations or needs to find a specialist.",
  inputSchema: z.object({
    specialization: z.string().optional().describe("Doctor specialization to filter by, e.g. 'cardiologist', 'dermatologist'. Leave empty to list all."),
  }),
  outputSchema: z.object({
    doctors: z.array(z.object({
      name: z.string(),
      specialization: z.string(),
    })),
  }),
  execute: async (input) => {
    const where: any = {};
    if (input.specialization) {
      where.specialization = {
        contains: input.specialization,
        mode: "insensitive",
      };
    }

    const doctors = await prisma.doctor.findMany({
      where,
      include: { user: { select: { name: true } } },
      take: 10,
    });

    return {
      doctors: doctors.map((d) => ({
        name: d.user.name,
        specialization: d.specialization || "General",
      })),
    };
  },
});
