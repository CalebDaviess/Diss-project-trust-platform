package com.trustplatform.accountability.dto;

import com.trustplatform.accountability.domain.AccountabilityStatus;
import com.trustplatform.accountability.domain.OffenceSource;
import com.trustplatform.accountability.domain.OffenceType;

import java.time.Instant;

public record CaseView(
        Instant timestamp,
        OffenceType offenceType,
        OffenceSource source,
        Integer score,
        AccountabilityStatus status
) {
}
