package org.example.qinglang.repository;

import org.example.qinglang.entity.PartyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartyRepository extends JpaRepository<PartyEntity, Integer> {

    @Query("SELECT p.nationality, COUNT(p) FROM PartyEntity p " +
            "WHERE p.caseEntity.caseId IN :caseIds " +
            "AND p.nationality IS NOT NULL AND p.nationality != '' " +
            "GROUP BY p.nationality ORDER BY COUNT(p) DESC")
    List<Object[]> countPartiesByNationalityAndCaseIds(@Param("caseIds") List<Integer> caseIds);

    // PartyRepository.java 中添加
    List<PartyEntity> findByPartyNameContaining(String keyword);

    @Modifying
    @Query("DELETE FROM PartyEntity p WHERE p.caseEntity.caseId = :caseId")
    void deleteByCaseEntityCaseId(@Param("caseId") Integer caseId);

    List<PartyEntity> findByCaseEntityCaseId(Integer caseId);

}