const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const multer = require("multer");
const path = require("path");
const fs = require("fs");

async function getConnection(){
    const connection = await mysql.createConnection({
        host : 'localhost',
        user : 'root',
        password : 'adminuser',
        database : 'mystargram'
    });
    return connection;
}

// 업로드 폴더 생성 - fs 를 require 에서 끌고 온 이유
// 업로드용 폴더로 사용할 폴더를 조사해보고 없으면 생성, 있으면 그 폴더를 이용(그냥 지나감)
try{
    fs.readdirSync("uploads");
}catch(err){
    console.error("uploads 폴더가 없어 uploads 폴더를 생성합니다.");
    fs.mkdirSync("uploads");
}

// multer 를 이용해서 업로드를 수행할 객체를 생성합니다.
// const multerObj = multer();
// const multerObj = multer({storage:multer.diskStorage({ destination(){}, filename(){}, }), limits:{}})
const multerObj = multer(
    {
        storage:multer.diskStorage(
            {
                destination(req, file, done){ // 업로드된 파일이 저장될 폴더 설정
                    done(null, "uploads/");
                },
                filename(req, file, done){ // 업로드된 파일이 저장되기 전 파일이름을 변경하는 설정
                    const ext = path.extname(file.originalname);
                    const fn = path.basename(file.originalname, ext) + Date.now() + ext;
                    // abc.jpg -> abc + "1234567" + ".jpg";
                    done(null, fn);
                },
            }
        ), 
        limits:{
            fileSize: 5 * 1024 * 1024,
        },
    }
);

router.get("/getPostList", async(req,res)=>{
    try{
        const connection = await getConnection();
        const sql = "select* from post order by id desc";
        const [rows, fields] = await connection.query(sql);

        res.send({postList:rows})

    }catch(err){
        next(err);
        res.send({msg:"NO"});
    }
});

router.post("/imgup", multerObj.single("image"), async(req, res)=>{
    console.log("savefilename : " + req.file.filename);
    const savefilename = req.file.filename;

    res.send({savefilename:savefilename});
})

router.post("/insertPost", async(req,res)=>{
    const {content, writer} = req.body;
    
    try{
        const connection = await getConnection();
        let sql = "insert into post(content, writer) values(?,?)";
        let [result, fields] = await connection.query(sql, [content, writer]);

        const postid = result.insertId;

        console.log(`postid : ${postid}`);

        // content 에서 해시태그를 분리합니다.
        const hashtags = content.match(/(?<=#)[^\s#]+/g);
        console.log(`해시태그들 : ${hashtags}`);

        // 각 해시태그들을 새로운 태그들만 hashtag 테이블에 저장합니다, id 저장
        if(hashtags){
            hashtags.map(async(tag, idx)=>{
                // 현재 태그가 hashtag 테이블에 존재하는지 조회
                sql = "select* from hashtag where word=?"

                let[rows, fields2] = await connection.query(sql, [tag])
                let tagid;

                if(rows.length>=1){ //테이블에 데이터가 존재한다면
                    tagid = rows[0].id;

                }else{
                    sql = "insert into hashtag(word) values(?)";
                    let[result2, fields3] = await connection.query(sql, [tag]);
                    tagid = result2.insertId;
                }
                console.log(`tagid : ${tagid}(${tag})`);

                // postid 와 hashid 로 post_hash 테이블에 레코드를 추가

                sql = "insert into post_hash(postid, hashid) values(?,?)";

                let[result3, fields4] = await connection.query(sql, [postid, tagid]);
            })
        }


        res.send({id:postid});

    }catch(err){
        console.error(err);
    }

})

router.post("/insertImages", async(req,res)=>{
    const {postid, savefilename} = req.body;

        try{
    
            const sql = "insert into images(postid, savefilename) values(?,?)";
    
            const connection = await getConnection();
    
            const [result, fields2] = await connection.query(sql, [postid, savefilename]);
    
            res.send("OK");
    
        }catch(err){
    
            console.error(err);
    
        }
})

router.get("/getImages/:id", async(req,res)=>{
    try{
    
        const sql = "select* from images where postid=?";

        const connection = await getConnection();

        const [rows, fields2] = await connection.query(sql, [req.params.id]);

        res.send(rows);

    }catch(err){

        console.error(err);

    }
})

router.get("/getLikes/:id", async(req,res)=>{
    try{
    
        const sql = "select* from likes where postid=?";

        const connection = await getConnection();

        const [rows, fields2] = await connection.query(sql, [req.params.id]);

        res.send(rows);

    }catch(err){

        console.error(err);

    }
})

router.post("/addLike", async(req,res)=>{
    const {postid, likenick} = req.body;

    try{
    
        let sql = "select* from likes where postid=? and likenick=?";

        const connection = await getConnection();

        let [rows, fields] = await connection.query(sql, [postid, likenick]);

         //좋아요 내역이 있으면 삭제, 없으면 추가

        if(rows.length >= 1){
            sql = "delete from likes where postid=? and likenick=?"
            let [result, fields2] = await connection.query(sql, [postid, likenick]);
        }else{
            sql = "insert into likes(postid, likenick) values(?,?)"
            let [result, fields3] = await connection.query(sql, [postid, likenick]);
        }

        res.send("OK");

    }catch(err){

        console.error(err);

    }
})


module.exports = router;
