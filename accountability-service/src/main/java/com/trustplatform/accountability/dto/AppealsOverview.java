package com.trustplatform.accountability.dto;

import java.util.List;

/** The Appeals tab payload: sanctions open to appeal + the player's submitted appeals. */
public record AppealsOverview(
        List<AppealableSanction> appealable,
        List<AppealView> appeals
) {
}
