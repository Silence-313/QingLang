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

    @Query("SELECT DISTINCT c FROM CaseEntity c " +
            "LEFT JOIN c.parties p " +
            "WHERE c.caseNumber LIKE %:kw% " +
            "OR c.courtName LIKE %:kw% " +
            "OR p.partyName LIKE %:kw%")
    List<CaseEntity> searchByKeyword(@Param("kw") String keyword);

    @Query("SELECT c FROM CaseEntity c LEFT JOIN FETCH c.parties WHERE c.caseId = :id")
    Optional<CaseEntity> findByIdWithParties(@Param("id") Integer id);

    @Query("SELECT DISTINCT c FROM CaseEntity c " +
            "LEFT JOIN FETCH c.parties " +
            "LEFT JOIN CaseDetailEntity d ON c.caseId = d.caseId " +
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

    long count();

    @Query("SELECT COALESCE(SUM(c.totalPages), 0) FROM CaseEntity c")
    Long sumTotalPages();

    @Query("SELECT c.caseId FROM CaseEntity c")
    List<Integer> findAllCaseIds();

    @Query("SELECT COALESCE(SUM(c.totalPages), 0) FROM CaseEntity c WHERE c.caseId IN :caseIds")
    Long sumTotalPagesByCaseIds(@Param("caseIds") List<Integer> caseIds);

    /**
     * 根据省份简称获取案件ID列表（复用 province_stats 视图的映射逻辑）
     */
    @Query(value = "SELECT c.case_id FROM cases c WHERE " +
            "CASE " +
            "WHEN c.court_name LIKE '%最高人民法院%' THEN '北京' " +
            "WHEN c.court_name LIKE '%北京知识产权%' THEN '北京' " +
            "WHEN c.court_name LIKE '%上海知识产权%' THEN '上海' " +
            "WHEN c.court_name LIKE '%广州知识产权%' THEN '广东' " +
            "WHEN c.court_name LIKE '%海口海事%' THEN '海南' " +
            "WHEN c.court_name LIKE '%西安铁路%' THEN '陕西' " +
            "WHEN c.court_name LIKE '%武汉海事%' THEN '湖北' " +
            "WHEN c.court_name LIKE '%宁波海事%' THEN '浙江' " +
            "WHEN c.court_name LIKE '%青岛海事%' THEN '山东' " +
            "WHEN c.court_name LIKE '%大连海事%' THEN '辽宁' " +
            "WHEN c.court_name LIKE '%厦门海事%' THEN '福建' " +
            "WHEN c.court_name LIKE '%北海海事%' THEN '广西' " +
            "WHEN c.court_name LIKE '%上海海事%' THEN '上海' " +
            "WHEN c.court_name LIKE '%天津海事%' THEN '天津' " +
            "WHEN c.court_name LIKE '%南京海事%' THEN '江苏' " +
            "WHEN c.court_name LIKE '%绥芬河%' THEN '黑龙江' " +
            "WHEN c.court_name LIKE '%霍尔果斯%' THEN '新疆' " +
            "WHEN c.court_name LIKE '%阿拉山口%' THEN '新疆' " +
            "WHEN c.court_name LIKE '%满洲里%' THEN '内蒙古' " +
            "WHEN c.court_name LIKE '%二连浩特%' THEN '内蒙古' " +
            "WHEN c.court_name LIKE '%北京%' THEN '北京' " +
            "WHEN c.court_name LIKE '%天津%' THEN '天津' " +
            "WHEN c.court_name LIKE '%上海%' THEN '上海' " +
            "WHEN c.court_name LIKE '%重庆%' THEN '重庆' " +
            "WHEN c.court_name LIKE '%河北%' THEN '河北' " +
            "WHEN c.court_name LIKE '%山西%' THEN '山西' " +
            "WHEN c.court_name LIKE '%内蒙古%' THEN '内蒙古' " +
            "WHEN c.court_name LIKE '%辽宁%' THEN '辽宁' " +
            "WHEN c.court_name LIKE '%吉林%' THEN '吉林' " +
            "WHEN c.court_name LIKE '%黑龙江%' THEN '黑龙江' " +
            "WHEN c.court_name LIKE '%江苏%' THEN '江苏' " +
            "WHEN c.court_name LIKE '%浙江%' THEN '浙江' " +
            "WHEN c.court_name LIKE '%安徽%' THEN '安徽' " +
            "WHEN c.court_name LIKE '%福建%' THEN '福建' " +
            "WHEN c.court_name LIKE '%江西%' THEN '江西' " +
            "WHEN c.court_name LIKE '%山东%' THEN '山东' " +
            "WHEN c.court_name LIKE '%河南%' THEN '河南' " +
            "WHEN c.court_name LIKE '%湖北%' THEN '湖北' " +
            "WHEN c.court_name LIKE '%湖南%' THEN '湖南' " +
            "WHEN c.court_name LIKE '%广东%' THEN '广东' " +
            "WHEN c.court_name LIKE '%广西%' THEN '广西' " +
            "WHEN c.court_name LIKE '%海南%' THEN '海南' " +
            "WHEN c.court_name LIKE '%四川%' THEN '四川' " +
            "WHEN c.court_name LIKE '%贵州%' THEN '贵州' " +
            "WHEN c.court_name LIKE '%云南%' THEN '云南' " +
            "WHEN c.court_name LIKE '%西藏%' THEN '西藏' " +
            "WHEN c.court_name LIKE '%陕西%' THEN '陕西' " +
            "WHEN c.court_name LIKE '%甘肃%' THEN '甘肃' " +
            "WHEN c.court_name LIKE '%青海%' THEN '青海' " +
            "WHEN c.court_name LIKE '%宁夏%' THEN '宁夏' " +
            "WHEN c.court_name LIKE '%新疆%' THEN '新疆' " +
            "WHEN c.court_name LIKE '%台湾%' THEN '台湾' " +
            "WHEN c.court_name LIKE '%香港%' THEN '香港' " +
            "WHEN c.court_name LIKE '%澳门%' THEN '澳门' " +
            "WHEN c.court_name LIKE '%合肥%' THEN '安徽' " +
            "WHEN c.court_name LIKE '%芜湖%' THEN '安徽' " +
            "WHEN c.court_name LIKE '%蚌埠%' THEN '安徽' " +
            "WHEN c.court_name LIKE '%福州%' THEN '福建' " +
            "WHEN c.court_name LIKE '%厦门%' THEN '福建' " +
            "WHEN c.court_name LIKE '%兰州%' THEN '甘肃' " +
            "WHEN c.court_name LIKE '%广州%' THEN '广东' " +
            "WHEN c.court_name LIKE '%深圳%' THEN '广东' " +
            "WHEN c.court_name LIKE '%南宁%' THEN '广西' " +
            "WHEN c.court_name LIKE '%贵阳%' THEN '贵州' " +
            "WHEN c.court_name LIKE '%海口%' THEN '海南' " +
            "WHEN c.court_name LIKE '%石家庄%' THEN '河北' " +
            "WHEN c.court_name LIKE '%郑州%' THEN '河南' " +
            "WHEN c.court_name LIKE '%哈尔滨%' THEN '黑龙江' " +
            "WHEN c.court_name LIKE '%武汉%' THEN '湖北' " +
            "WHEN c.court_name LIKE '%长沙%' THEN '湖南' " +
            "WHEN c.court_name LIKE '%长春%' THEN '吉林' " +
            "WHEN c.court_name LIKE '%南京%' THEN '江苏' " +
            "WHEN c.court_name LIKE '%南昌%' THEN '江西' " +
            "WHEN c.court_name LIKE '%沈阳%' THEN '辽宁' " +
            "WHEN c.court_name LIKE '%呼和浩特%' THEN '内蒙古' " +
            "WHEN c.court_name LIKE '%银川%' THEN '宁夏' " +
            "WHEN c.court_name LIKE '%西宁%' THEN '青海' " +
            "WHEN c.court_name LIKE '%济南%' THEN '山东' " +
            "WHEN c.court_name LIKE '%太原%' THEN '山西' " +
            "WHEN c.court_name LIKE '%西安%' THEN '陕西' " +
            "WHEN c.court_name LIKE '%成都%' THEN '四川' " +
            "WHEN c.court_name LIKE '%乌鲁木齐%' THEN '新疆' " +
            "WHEN c.court_name LIKE '%拉萨%' THEN '西藏' " +
            "WHEN c.court_name LIKE '%昆明%' THEN '云南' " +
            "WHEN c.court_name LIKE '%杭州%' THEN '浙江' " +
            "ELSE '其他' END = :province", nativeQuery = true)
    List<Integer> findCaseIdsByProvince(@Param("province") String province);

    @Query("SELECT DISTINCT c FROM CaseEntity c " +
            "JOIN CaseDetailEntity d ON c.caseId = d.caseId " +
            "WHERE d.caseReason = :caseReason")
    List<CaseEntity> findByCaseReason(@Param("caseReason") String caseReason);

    // CaseRepository.java 中添加
    List<CaseEntity> findByCaseNameContaining(String keyword);

    @Query("SELECT c.caseType, COUNT(c) FROM CaseEntity c WHERE c.caseId IN :caseIds GROUP BY c.caseType")
    List<Object[]> countCaseTypeByCaseIds(@Param("caseIds") List<Integer> caseIds);

    @Query("SELECT c FROM CaseEntity c LEFT JOIN FETCH c.parties WHERE c.caseType = :type")
    List<CaseEntity> findByCaseTypeWithDetails(@Param("type") String type);

    // CaseRepository.java
    @Query("SELECT FUNCTION('YEAR', c.acceptanceDate), COUNT(c) FROM CaseEntity c " +
            "WHERE c.caseId IN :caseIds AND c.acceptanceDate IS NOT NULL " +
            "GROUP BY FUNCTION('YEAR', c.acceptanceDate) ORDER BY FUNCTION('YEAR', c.acceptanceDate)")
    List<Object[]> countCasesByYearAndCaseIds(@Param("caseIds") List<Integer> caseIds);

}