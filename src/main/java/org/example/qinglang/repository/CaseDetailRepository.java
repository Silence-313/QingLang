package org.example.qinglang.repository;

import org.example.qinglang.entity.CaseDetailEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaseDetailRepository extends JpaRepository<CaseDetailEntity, Integer> {

    Optional<CaseDetailEntity> findByCaseId(Integer caseId);

    @Query("SELECT DISTINCT d.caseReason FROM CaseDetailEntity d WHERE d.caseReason IS NOT NULL AND d.caseReason != ''")
    List<String> findAllDistinctCaseReasons();

    @Query("SELECT d.applicableLaw FROM CaseDetailEntity d WHERE d.caseId IN :caseIds AND d.applicableLaw IS NOT NULL AND d.applicableLaw != ''")
    List<String> findApplicableLawsByCaseIds(@Param("caseIds") List<Integer> caseIds);
}