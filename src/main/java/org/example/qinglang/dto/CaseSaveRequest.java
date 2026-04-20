package org.example.qinglang.dto;

import lombok.Data;
import org.example.qinglang.entity.*;

import java.util.List;

@Data
public class CaseSaveRequest {
    private CaseEntity caseInfo;
    private List<PartyEntity> parties;
    private CaseDetailEntity caseDetail;
    private LegalSupervisionEntity legalSupervision;
}