import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface PatchBody {
  type?: "MOVIE" | "SERIES";
  isHidden?: boolean;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as PatchBody;

    if (!id) {
      return errorResponse(400, "BAD_REQUEST", "ID da midia e obrigatorio.");
    }

    if (body.type !== "MOVIE" && body.type !== "SERIES") {
      return errorResponse(400, "BAD_REQUEST", "Campo 'type' deve ser MOVIE ou SERIES.");
    }

    if (typeof body.isHidden !== "boolean") {
      return errorResponse(400, "BAD_REQUEST", "Campo 'isHidden' deve ser boolean.");
    }

    const db = await prisma();
    const hiddenAt = body.isHidden ? new Date() : null;

    if (body.type === "MOVIE") {
      await db.movie.update({
        where: { id },
        data: { isHidden: body.isHidden, hiddenAt },
      });
    } else {
      await db.series.update({
        where: { id },
        data: { isHidden: body.isHidden, hiddenAt },
      });
    }

    return successResponse({ id, isHidden: body.isHidden, hiddenAt }, 200);
  } catch (error) {
    logger.error("Falha ao atualizar visibilidade da midia", error);
    return errorResponse(500, "DATABASE_ERROR", "Nao foi possivel atualizar a visibilidade.");
  }
}
