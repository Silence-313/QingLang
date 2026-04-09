package org.example.qinglang.repository;

import org.example.qinglang.entity.CaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface CaseRepository extends JpaRepository<CaseEntity, Integer> {

    Optional<CaseEntity> findByCaseNumber(String caseNumber);

    // CaseRepository.java[cite: 6]
    @Query("SELECT DISTINCT c FROM CaseEntity c " +
            "LEFT JOIN c.parties p " +
            "WHERE c.caseNumber LIKE %:kw% " +
            "OR c.courtName LIKE %:kw% " +
            "OR p.partyName LIKE %:kw%")
    List<CaseEntity> searchByKeyword(@Param("kw") String keyword);

    // 使用 EntityGraph 或 Fetch Join 避免 N+1 问题，一次性查出详情
    @Query("SELECT c FROM CaseEntity c LEFT JOIN FETCH c.parties WHERE c.caseId = :id")
    Optional<CaseEntity> findByIdWithParties(@Param("id") Integer id);

    @Query("SELECT DISTINCT c FROM CaseEntity c " +
            "LEFT JOIN FETCH c.parties " +
            "JOIN CaseDetailEntity d ON c.caseId = d.caseId " +
            "WHERE (c.caseName LIKE %:keyword% OR c.caseNumber LIKE %:keyword%) " +
            "AND (:type IS NULL OR :type = '' OR c.caseType = :type) " +
            "AND (:reason IS NULL OR :reason = '' OR d.caseReason = :reason)")
    List<CaseEntity> findByAdvancedCriteria(
            @Param("keyword") String keyword,
            @Param("type") String type,
            @Param("reason") String reason
    );

    @Query("SELECT DISTINCT c.caseType FROM CaseEntity c WHERE c.caseType IS NOT NULL AND c.caseType != ''")
    List<String> findAllDistinctCaseTypes();

}