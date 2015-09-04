/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals _:true, $:true */
/*globals require:true, describe:true, it:true,
          data:true */
"use strict";

// Helper functions
function addDate(date, days, months, years) {
    var result = new Date(date);
    result.setUTCDate(date.getUTCDate() + days);
    result.setUTCMonth(date.getUTCMonth() + months);
    result.setUTCFullYear(date.getFullYear() + years);
    return result;
}

function addDays(date, days) {
    return addDate(date, days, 0, 0);
}

function addMonths(date, months) {
    return addDate(date, 0, months, 0);
}

function addYears(date, years) {
    return addDate(date, 0, 0, years);
}

describe('data', function(){
    describe('#needsUpdate()', function(){
        it('should return true when updateInfo is null', function(){
            data.needsUpdate().should.be.true;
        });
        
        it('should return false when updateInfo.date is after now', function(){
            data.info = { date: Date.now() + 10000 };
            data.needsUpdate().should.be.false;
        });
        
        it('should return false when updateInfo.date is equal to updateInfo.date', function(){
            data.info = { date: Date.now()}; 
            data.needsUpdate(data.info).should.be.false;
        });
        
        it('should return false when updateInfo.date is 1 day after updateInfo.date', function(){
            var d = new Date();
            var updateInfo = { date: d.getTime() };
            data.info = { date: addDays(d, 1).getTime() }; 
            data.needsUpdate(updateInfo).should.be.false;
        });
        
        it('should return false when updateInfo.date is 6 days after updateInfo.date', function(){
            var d = new Date();
            var updateInfo = { date: d.getTime() };
            data.info = { date: addDays(d, 6).getTime() }; 
            data.needsUpdate(updateInfo).should.be.false;
        });
        
        it('should return true when updateInfo.date is 7 days after updateInfo.date', function(){
            var d = new Date();
            var updateInfo = { date: d.getTime() };
            data.info = { date: addDays(d, 7).getTime() }; 
            data.needsUpdate(updateInfo).should.be.true;
        });
        
        it('should return false when updateInfo.date is 1 month after updateInfo.date', function(){
            var d = new Date();
            var updateInfo = { date: d.getTime() };
            data.info = { date: addMonths(d, 1).getTime() }; 
            data.needsUpdate(updateInfo).should.be.true;
        });
        
        it('should return false when updateInfo.date is 1 month and 1 day after updateInfo.date', function(){
            var d = new Date();
            var updateInfo = { date: d.getTime() };
            data.info = { date: addDate(d, 1, 1, 0).getTime() }; 
            data.needsUpdate(updateInfo).should.be.true;
        });
        
        it('should return true when updateInfo.date is 1 year after updateInfo.date', function(){
            var d = new Date();
            var updateInfo = { date: d.getTime() };
            data.info = { date: addYears(d, 1).getTime() }; 
            data.needsUpdate(updateInfo).should.be.true;
        });
        
        it('should return false when updateInfo.date is 1 year and 1 day after updateInfo.date', function(){
            var d = new Date();
            var updateInfo = { date: d.getTime() };
            data.info = { date: addDate(d, 1, 0, 1).getTime() }; 
            data.needsUpdate(updateInfo).should.be.true;
        });
    });
});
